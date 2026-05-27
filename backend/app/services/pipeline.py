import time
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import (
    Customer,
    Review,
    ReviewClassification,
    ReviewResponse,
    ServiceCase,
)
from app.schemas.review import ReviewCreateRequest
from app.services.classification import ClassificationService
from app.services.ai_provider_runtime import AIProviderRuntime
from app.services.operational_log import log_event
from app.services.phrase_matching import PhraseMatchingService
from app.services.response_generation import ResponseGenerationService
from app.services.review_ids import format_request_number, normalize_order_number
from app.services.template_selection import TemplateSelectionService


class ReviewPipeline:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.ai_runtime = AIProviderRuntime(db)

    def ingest_and_process(self, payload: ReviewCreateRequest) -> tuple[uuid.UUID, str]:
        ingest_start = time.perf_counter()
        customer = self._get_or_create_customer(payload)
        service_case = self._create_service_case(customer, payload)
        review = self._create_review(customer, service_case, payload)

        ingest_ms = int((time.perf_counter() - ingest_start) * 1000)
        log_event(
            self.db,
            event_type="review_received",
            entity_type="review",
            entity_id=review.id,
            latency_ms=ingest_ms,
            status="ok",
            metadata={"step": "ingestion"},
        )
        self.db.commit()

        try:
            return self._run_processing(review, customer, payload)
        except Exception as exc:
            self.db.rollback()
            log_event(
                self.db,
                event_type="pipeline_failed",
                entity_type="review",
                entity_id=review.id,
                status="error",
                error_message=str(exc),
            )
            self.db.commit()
            return review.id, "failed"

    def _get_or_create_customer(self, payload: ReviewCreateRequest) -> Customer:
        customer = None
        if payload.email:
            customer = (
                self.db.query(Customer)
                .filter(Customer.email == payload.email)
                .first()
            )
        if not customer:
            customer = Customer(
                customer_name=payload.customer_name,
                email=payload.email,
                customer_segment="retail",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            self.db.add(customer)
            self.db.flush()
        elif not customer.customer_name:
            customer.customer_name = payload.customer_name
        return customer

    def _create_service_case(
        self, customer: Customer, payload: ReviewCreateRequest
    ) -> ServiceCase:
        order_number = payload.order_number or (payload.service_case_title or "").strip()
        case = ServiceCase(
            customer_id=customer.id,
            case_type="review_submission",
            case_title=f"Заказ {order_number}" if order_number else (payload.service_case_title or "Заказ"),
            product_area=payload.product_area,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(case)
        self.db.flush()
        return case

    def _create_review(
        self,
        customer: Customer,
        service_case: ServiceCase,
        payload: ReviewCreateRequest,
    ) -> Review:
        order_number = (payload.order_number or "").strip()
        if not order_number:
            order_number = (payload.service_case_title or "").strip()
        if not order_number:
            order_number = "NL-00000000"
        order_number = normalize_order_number(order_number)

        seq = self._next_request_sequence(order_number)
        request_number = format_request_number(order_number, seq)

        review = Review(
            customer_id=customer.id,
            service_case_id=service_case.id,
            review_text=payload.review_text,
            rating=payload.rating,
            product_area=payload.product_area,
            order_number=order_number,
            request_sequence=seq,
            request_number=request_number,
            source_channel="web_form",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(review)
        self.db.flush()
        return review

    def _next_request_sequence(self, order_number: str) -> int:
        current = self.db.scalar(
            select(func.max(Review.request_sequence)).where(Review.order_number == order_number)
        )
        return int(current or 0) + 1

    def _run_processing(
        self,
        review: Review,
        customer: Customer,
        payload: ReviewCreateRequest,
    ) -> tuple[uuid.UUID, str]:
        pipeline_start = time.perf_counter()

        phrase_service = PhraseMatchingService(self.db)
        phrase_match, phrase_latency = phrase_service.match(review.review_text)

        log_event(
            self.db,
            event_type="phrase_matching_completed",
            entity_type="review",
            entity_id=review.id,
            latency_ms=phrase_latency,
            status="ok",
            metadata={"classification_source": phrase_match.classification_source},
        )

        resolved = self.ai_runtime.resolve(review_id=review.id)
        self.db.flush()

        rating_for_ai = review.rating if review.rating is not None else 3
        classification_service = ClassificationService(self.db, resolved.provider)
        classification, class_prompt, class_latency = classification_service.classify(
            review_text=review.review_text,
            rating=rating_for_ai,
            product_area=review.product_area or payload.product_area,
            phrase_match=phrase_match,
        )

        log_event(
            self.db,
            event_type="classification_completed",
            entity_type="review",
            entity_id=review.id,
            prompt_version_id=class_prompt.id,
            model_name=resolved.provider.model_name,
            latency_ms=class_latency,
            status="ok",
            metadata={"provider_key": resolved.provider_key},
        )

        matched_phrase_id = phrase_match.matched_phrase.id if phrase_match.matched_phrase else None

        classification_row = ReviewClassification(
            review_id=review.id,
            prompt_version_id=class_prompt.id,
            matched_phrase_id=matched_phrase_id,
            phrase_match_score=phrase_match.phrase_match_score,
            classification_source=phrase_match.classification_source,
            scenario=classification.scenario,
            sentiment=classification.sentiment,
            priority=classification.priority,
            topic=classification.topic,
            product_area=classification.product_area,
            rating=review.rating,
            confidence=classification.confidence,
            needs_phrase_review=phrase_match.needs_phrase_review,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(classification_row)
        self.db.flush()

        template_service = TemplateSelectionService(self.db)
        template, template_latency = template_service.select(classification)

        log_event(
            self.db,
            event_type="template_selected",
            entity_type="review",
            entity_id=review.id,
            latency_ms=template_latency,
            status="ok",
            metadata={"template_id": str(template.id)},
        )

        generation_service = ResponseGenerationService(
            self.db, resolved.provider, resolved
        )
        draft, gen_latency, gen_prompt, gen_metadata = generation_service.generate(
            review=review,
            classification=classification,
            template=template,
            customer_name=customer.customer_name or payload.customer_name,
        )

        response_row = ReviewResponse(
            review_id=review.id,
            classification_id=classification_row.id,
            template_id=template.id,
            prompt_version_id=gen_prompt.id,
            draft_response=draft,
            generation_metadata=gen_metadata,
            moderation_status="pending_review",
            publication_status="not_published",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.db.add(response_row)

        pipeline_ms = int((time.perf_counter() - pipeline_start) * 1000)
        log_event(
            self.db,
            event_type="draft_generated",
            entity_type="review",
            entity_id=review.id,
            prompt_version_id=gen_prompt.id,
            model_name=resolved.provider.model_name,
            latency_ms=gen_latency,
            status="ok",
            metadata={
                "pipeline_total_ms": pipeline_ms,
                "provider_key": resolved.provider_key,
            },
        )

        self.db.commit()
        return review.id, "pending_review"
