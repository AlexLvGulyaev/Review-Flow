from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.entities import (
    Customer,
    Review,
    ReviewClassification,
    ReviewResponse,
)
from app.schemas.review import ReviewCreateRequest
from app.services.ai_provider_runtime import AIProviderRuntime
from app.services.classification_refs import ClassificationRefsService
from app.services.controlled_hybrid.confidence import ConfidenceBand, evaluate_confidence
from app.services.controlled_hybrid.decisions import (
    create_decision,
    persist_match_results,
    record_feedback,
)
from app.services.controlled_hybrid.draft_generation import CaseDraftGenerationService
from app.services.controlled_hybrid.retrieval import ResponseCaseRetrievalService
from app.services.operational_log import log_event


class ControlledHybridPipeline:
    def __init__(self, db: Session) -> None:
        self.db = db

    def process_review(
        self,
        review: Review,
        customer: Customer,
        payload: ReviewCreateRequest,
    ) -> tuple[uuid.UUID, str]:
        pipeline_start = time.perf_counter()
        customer_name = customer.customer_name or payload.customer_name or "Клиент"

        retrieval_service = ResponseCaseRetrievalService(self.db)
        retrieval = retrieval_service.retrieve(review.review_text)

        log_event(
            self.db,
            event_type="case_retrieval_completed",
            entity_type="review",
            entity_id=review.id,
            latency_ms=retrieval.latency_ms,
            status="ok",
            metadata={
                "candidate_count": len(retrieval.candidates),
                "top_score": retrieval.candidates[0].match_score if retrieval.candidates else None,
            },
        )

        if not retrieval.candidates:
            log_event(
                self.db,
                event_type="case_retrieval_low_confidence",
                entity_type="review",
                entity_id=review.id,
                status="ok",
                metadata={"reason": "no_active_cases_or_examples"},
            )
            persist_match_results(
                self.db,
                review_id=review.id,
                ranked=[],
                selected_case_id=None,
                decision_id=None,
            )
            record_feedback(
                self.db,
                review_id=review.id,
                feedback_type="new_case_needed",
                comment="No response case candidates found during retrieval",
            )
            self._create_pending_response(review, band=ConfidenceBand.LOW, metadata_extra={})
            self.db.commit()
            return review.id, "pending_review"

        top = retrieval.candidates[0]
        confidence = evaluate_confidence(top.match_score, top.response_case.confidence_threshold)
        band = confidence.band

        log_event(
            self.db,
            event_type="case_confidence_evaluated",
            entity_type="review",
            entity_id=review.id,
            status="ok",
            metadata={
                "confidence_band": band.value,
                "match_score": confidence.match_score,
                "threshold": confidence.threshold,
                "medium_floor": confidence.medium_floor,
                "case_code": top.response_case.case_code,
            },
        )

        decision = None
        classification_row = None

        if band == ConfidenceBand.LOW:
            log_event(
                self.db,
                event_type="case_retrieval_low_confidence",
                entity_type="review",
                entity_id=review.id,
                status="ok",
                metadata={
                    "confidence_band": band.value,
                    "match_score": confidence.match_score,
                    "suggested_case_code": top.response_case.case_code,
                },
            )
            persist_match_results(
                self.db,
                review_id=review.id,
                ranked=retrieval.candidates,
                selected_case_id=None,
                decision_id=None,
            )
            record_feedback(
                self.db,
                review_id=review.id,
                feedback_type="new_case_needed",
                response_case_id=top.response_case.id,
                comment="Low confidence — operator must select or propose a case",
            )
            self._create_pending_response(
                review,
                band=band,
                metadata_extra={
                    "suggested_response_case_id": str(top.response_case.id),
                    "suggested_case_code": top.response_case.case_code,
                },
            )
            self.db.commit()
            return review.id, "pending_review"

        decision_source = "retrieval_auto"
        decision = create_decision(
            self.db,
            review_id=review.id,
            response_case=top.response_case,
            match_score=top.match_score,
            decision_source=decision_source,
        )
        persist_match_results(
            self.db,
            review_id=review.id,
            ranked=retrieval.candidates,
            selected_case_id=top.response_case.id,
            decision_id=decision.id,
        )

        classification_row = self._audit_classification_from_case(
            review, top.response_case, top.match_score
        )

        log_event(
            self.db,
            event_type="case_decision_recorded",
            entity_type="review",
            entity_id=review.id,
            status="ok",
            metadata={
                "decision_id": str(decision.id),
                "decision_source": decision_source,
                "confidence_band": band.value,
                "response_case_id": str(top.response_case.id),
            },
        )

        resolved = AIProviderRuntime(self.db).resolve(review_id=review.id)
        self.db.flush()

        generation_service = CaseDraftGenerationService(self.db, resolved)
        draft, gen_latency, gen_prompt, gen_metadata = generation_service.generate(
            review=review,
            response_case=top.response_case,
            customer_name=customer_name,
        )
        gen_metadata.update(
            {
                "confidence_band": band.value,
                "match_confidence": top.match_score,
                "operator_case_confirmed": band == ConfidenceBand.HIGH,
                "requires_operator_case_confirmation": band == ConfidenceBand.MEDIUM,
            }
        )

        response_row = ReviewResponse(
            review_id=review.id,
            classification_id=classification_row.id if classification_row else None,
            template_id=None,
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
                "pipeline": "controlled_hybrid",
                "pipeline_total_ms": pipeline_ms,
                "confidence_band": band.value,
                "provider_key": resolved.provider_key,
            },
        )

        self.db.commit()
        return review.id, "pending_review"

    def _audit_classification_from_case(
        self,
        review: Review,
        case,
        match_score: float,
    ) -> ReviewClassification:
        refs = ClassificationRefsService(self.db)
        scenario_row = refs.get_scenario_by_id(case.scenario_id)
        sentiment_row = refs.get_sentiment_by_id(case.sentiment_id)
        priority_row = refs.get_priority_by_id(case.priority_id)
        row = ReviewClassification(
            review_id=review.id,
            scenario_id=case.scenario_id,
            sentiment_id=case.sentiment_id,
            priority_id=case.priority_id,
            classification_source="derived_from_response_case",
            confidence=match_score,
            rating=review.rating,
            created_at=datetime.now(timezone.utc),
        )
        refs.sync_classification_legacy(row, scenario_row, sentiment_row, priority_row)
        self.db.add(row)
        self.db.flush()
        return row

    def _create_pending_response(
        self,
        review: Review,
        *,
        band: ConfidenceBand,
        metadata_extra: dict,
    ) -> None:
        metadata = {
            "pipeline": "controlled_hybrid",
            "confidence_band": band.value,
            "operator_case_confirmed": False,
            "requires_operator_case_confirmation": True,
            **metadata_extra,
        }
        row = ReviewResponse(
            review_id=review.id,
            draft_response=None,
            generation_metadata=metadata,
            moderation_status="pending_review",
            publication_status="not_published",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
