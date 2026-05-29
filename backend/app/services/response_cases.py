from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.ch_entities import ProductArea, ResponseCase, ResponseCaseExample, ReviewTopic
from app.schemas.reference import ClassificationRefOut
from app.schemas.response_case import (
    ProductAreaOut,
    ResponseCaseExampleOut,
    ResponseCaseListItem,
    ResponseCaseOut,
    ReviewTopicOut,
)
from app.schemas.response_case_admin import (
    ResponseCaseCreate,
    ResponseCaseExampleCreate,
    ResponseCaseExampleUpdate,
    ResponseCaseListItemAdmin,
    ResponseCaseUpdate,
)
from app.services.classification_refs import ClassificationRefsService
from app.services.operational_log import log_event


class ResponseCaseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.refs = ClassificationRefsService(db)

    def list_cases_admin(
        self,
        *,
        is_active: bool | None = None,
        scenario_id: uuid.UUID | None = None,
        sentiment_id: uuid.UUID | None = None,
        priority_id: uuid.UUID | None = None,
        product_area_id: uuid.UUID | None = None,
        topic_id: uuid.UUID | None = None,
        search: str | None = None,
    ) -> list[ResponseCaseListItemAdmin]:
        items = self.list_cases(
            is_active=is_active,
            scenario_id=scenario_id,
            sentiment_id=sentiment_id,
            priority_id=priority_id,
            product_area_id=product_area_id,
            topic_id=topic_id,
            search=search,
        )
        if not items:
            return []
        ids = [i.id for i in items]
        counts = dict(
            self.db.execute(
                select(ResponseCaseExample.response_case_id, func.count(ResponseCaseExample.id))
                .where(
                    ResponseCaseExample.response_case_id.in_(ids),
                    ResponseCaseExample.is_active.is_(True),
                )
                .group_by(ResponseCaseExample.response_case_id)
            ).all()
        )
        return [
            ResponseCaseListItemAdmin(**item.model_dump(), examples_count=counts.get(item.id, 0))
            for item in items
        ]

    def list_cases(
        self,
        *,
        is_active: bool | None = True,
        scenario_id: uuid.UUID | None = None,
        sentiment_id: uuid.UUID | None = None,
        priority_id: uuid.UUID | None = None,
        product_area_id: uuid.UUID | None = None,
        topic_id: uuid.UUID | None = None,
        search: str | None = None,
    ) -> list[ResponseCaseListItem]:
        stmt = (
            select(ResponseCase)
            .options(
                joinedload(ResponseCase.interaction_scenario),
                joinedload(ResponseCase.sentiment_profile),
                joinedload(ResponseCase.priority_level),
                joinedload(ResponseCase.product_area),
                joinedload(ResponseCase.topic).joinedload(ReviewTopic.product_area),
            )
            .order_by(ResponseCase.title)
        )
        if is_active is not None:
            stmt = stmt.where(ResponseCase.is_active.is_(is_active))
        if scenario_id is not None:
            stmt = stmt.where(ResponseCase.scenario_id == scenario_id)
        if sentiment_id is not None:
            stmt = stmt.where(ResponseCase.sentiment_id == sentiment_id)
        if priority_id is not None:
            stmt = stmt.where(ResponseCase.priority_id == priority_id)
        if product_area_id is not None:
            stmt = stmt.where(ResponseCase.product_area_id == product_area_id)
        if topic_id is not None:
            stmt = stmt.where(ResponseCase.topic_id == topic_id)
        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    ResponseCase.title.ilike(pattern),
                    ResponseCase.case_code.ilike(pattern),
                    ResponseCase.description.ilike(pattern),
                )
            )
        rows = self.db.scalars(stmt).unique().all()
        return [self._list_item(row) for row in rows]

    def get_case(self, case_id: uuid.UUID, *, include_inactive_examples: bool = False) -> ResponseCaseOut | None:
        row = self.db.scalar(
            select(ResponseCase)
            .where(ResponseCase.id == case_id)
            .options(
                joinedload(ResponseCase.interaction_scenario),
                joinedload(ResponseCase.sentiment_profile),
                joinedload(ResponseCase.priority_level),
                joinedload(ResponseCase.product_area),
                joinedload(ResponseCase.topic).joinedload(ReviewTopic.product_area),
                joinedload(ResponseCase.examples),
            )
        )
        if not row:
            return None
        return self._detail(row, include_inactive_examples=include_inactive_examples)

    def create_case(self, payload: ResponseCaseCreate) -> ResponseCaseOut:
        existing = self.db.scalar(
            select(ResponseCase).where(ResponseCase.case_code == payload.case_code)
        )
        if existing:
            raise HTTPException(status_code=409, detail="case_code already exists")
        self._validate_case_refs(payload.scenario_id, payload.sentiment_id, payload.priority_id)
        self._validate_area_topic(payload.product_area_id, payload.topic_id)
        now = datetime.now(timezone.utc)
        row = ResponseCase(
            case_code=payload.case_code.strip(),
            title=payload.title.strip(),
            description=payload.description,
            scenario_id=payload.scenario_id,
            sentiment_id=payload.sentiment_id,
            priority_id=payload.priority_id,
            product_area_id=payload.product_area_id,
            topic_id=payload.topic_id,
            response_policy=payload.response_policy,
            approved_response_text=payload.approved_response_text,
            confidence_threshold=payload.confidence_threshold,
            review_policy=payload.review_policy,
            is_active=True,
            created_by="admin",
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        log_event(
            self.db,
            event_type="response_case_created",
            entity_type="response_case",
            entity_id=row.id,
            status="ok",
        )
        self.db.commit()
        out = self.get_case(row.id, include_inactive_examples=True)
        if not out:
            raise HTTPException(status_code=500, detail="Failed to load created case")
        return out

    def update_case(self, case_id: uuid.UUID, payload: ResponseCaseUpdate) -> ResponseCaseOut:
        row = self.db.get(ResponseCase, case_id)
        if not row:
            raise HTTPException(status_code=404, detail="Response case not found")
        data = payload.model_dump(exclude_unset=True)
        if "scenario_id" in data or "sentiment_id" in data or "priority_id" in data:
            self._validate_case_refs(
                data.get("scenario_id", row.scenario_id),
                data.get("sentiment_id", row.sentiment_id),
                data.get("priority_id", row.priority_id),
            )
        if "product_area_id" in data or "topic_id" in data:
            self._validate_area_topic(
                data.get("product_area_id", row.product_area_id),
                data.get("topic_id", row.topic_id),
            )
        for key, val in data.items():
            setattr(row, key, val)
        row.updated_at = datetime.now(timezone.utc)
        self.db.flush()
        log_event(
            self.db,
            event_type="response_case_updated",
            entity_type="response_case",
            entity_id=row.id,
            status="ok",
        )
        self.db.commit()
        out = self.get_case(case_id, include_inactive_examples=True)
        if not out:
            raise HTTPException(status_code=404, detail="Response case not found")
        return out

    def set_case_active(self, case_id: uuid.UUID, *, is_active: bool) -> ResponseCaseOut:
        return self.update_case(case_id, ResponseCaseUpdate(is_active=is_active))

    def create_example(self, case_id: uuid.UUID, payload: ResponseCaseExampleCreate) -> ResponseCaseExampleOut:
        row = self.db.get(ResponseCase, case_id)
        if not row:
            raise HTTPException(status_code=404, detail="Response case not found")
        now = datetime.now(timezone.utc)
        ex = ResponseCaseExample(
            response_case_id=case_id,
            example_text=payload.example_text.strip(),
            source=payload.source,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        self.db.add(ex)
        row.updated_at = now
        self.db.flush()
        self.db.commit()
        return ResponseCaseExampleOut(
            id=ex.id,
            example_text=ex.example_text,
            source=ex.source,
            source_review_id=ex.source_review_id,
            is_active=ex.is_active,
            created_at=ex.created_at,
        )

    def update_example(
        self, example_id: uuid.UUID, payload: ResponseCaseExampleUpdate
    ) -> ResponseCaseExampleOut:
        ex = self.db.get(ResponseCaseExample, example_id)
        if not ex:
            raise HTTPException(status_code=404, detail="Example not found")
        data = payload.model_dump(exclude_unset=True)
        for key, val in data.items():
            setattr(ex, key, val)
        ex.updated_at = datetime.now(timezone.utc)
        if ex.response_case_id:
            case = self.db.get(ResponseCase, ex.response_case_id)
            if case:
                case.updated_at = ex.updated_at
        self.db.commit()
        return ResponseCaseExampleOut(
            id=ex.id,
            example_text=ex.example_text,
            source=ex.source,
            source_review_id=ex.source_review_id,
            is_active=ex.is_active,
            created_at=ex.created_at,
        )

    def list_catalog(self) -> tuple[list[ProductArea], list[ReviewTopic]]:
        areas = list(
            self.db.scalars(
                select(ProductArea).where(ProductArea.is_active.is_(True)).order_by(ProductArea.name)
            ).all()
        )
        topics = list(
            self.db.scalars(
                select(ReviewTopic)
                .where(ReviewTopic.is_active.is_(True))
                .order_by(ReviewTopic.name)
            ).all()
        )
        return areas, topics

    @staticmethod
    def slugify_case_code(title: str) -> str:
        base = re.sub(r"[^a-zA-Z0-9]+", "_", title.lower()).strip("_")[:48]
        return base or "case"

    def _validate_case_refs(self, scenario_id, sentiment_id, priority_id) -> None:
        refs = self.refs
        if not refs.get_scenario_by_id(scenario_id):
            raise HTTPException(status_code=400, detail="Invalid scenario_id")
        if not refs.get_sentiment_by_id(sentiment_id):
            raise HTTPException(status_code=400, detail="Invalid sentiment_id")
        if not refs.get_priority_by_id(priority_id):
            raise HTTPException(status_code=400, detail="Invalid priority_id")

    def _validate_area_topic(self, product_area_id, topic_id) -> None:
        if not self.db.get(ProductArea, product_area_id):
            raise HTTPException(status_code=400, detail="Invalid product_area_id")
        if not self.db.get(ReviewTopic, topic_id):
            raise HTTPException(status_code=400, detail="Invalid topic_id")

    @staticmethod
    def _product_area_out(area: ProductArea) -> ProductAreaOut:
        return ProductAreaOut(
            id=area.id,
            code=area.code,
            name=area.name,
            description=area.description,
            is_active=area.is_active,
        )

    def _topic_out(self, topic: ReviewTopic) -> ReviewTopicOut:
        pa_ref = None
        if topic.product_area:
            pa_ref = ClassificationRefOut(
                id=topic.product_area.id,
                code=topic.product_area.code,
                name=topic.product_area.name,
            )
        return ReviewTopicOut(
            id=topic.id,
            code=topic.code,
            name=topic.name,
            description=topic.description,
            product_area=pa_ref,
            is_active=topic.is_active,
        )

    def _list_item(self, row: ResponseCase) -> ResponseCaseListItem:
        scenario = self.refs.scenario_ref(row.interaction_scenario)
        sentiment = self.refs.sentiment_ref(row.sentiment_profile)
        priority = self.refs.priority_ref(row.priority_level)
        assert scenario and sentiment and priority
        return ResponseCaseListItem(
            id=row.id,
            case_code=row.case_code,
            title=row.title,
            description=row.description,
            scenario=scenario,
            sentiment=sentiment,
            priority=priority,
            product_area=self._product_area_out(row.product_area),
            topic=self._topic_out(row.topic),
            confidence_threshold=Decimal(str(row.confidence_threshold)),
            review_policy=row.review_policy,
            is_active=row.is_active,
            updated_at=row.updated_at,
        )

    def _detail(self, row: ResponseCase, *, include_inactive_examples: bool = False) -> ResponseCaseOut:
        base = self._list_item(row)
        examples = sorted(row.examples, key=lambda e: e.created_at)
        return ResponseCaseOut(
            **base.model_dump(),
            response_policy=row.response_policy,
            approved_response_text=row.approved_response_text,
            created_by=row.created_by,
            created_at=row.created_at,
            examples=[
                ResponseCaseExampleOut(
                    id=e.id,
                    example_text=e.example_text,
                    source=e.source,
                    source_review_id=e.source_review_id,
                    is_active=e.is_active,
                    created_at=e.created_at,
                )
                for e in examples
                if include_inactive_examples or e.is_active
            ],
        )
