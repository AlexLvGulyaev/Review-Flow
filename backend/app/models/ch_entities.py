import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProductArea(Base):
    __tablename__ = "product_areas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    topics: Mapped[list["ReviewTopic"]] = relationship(back_populates="product_area")
    response_cases: Mapped[list["ResponseCase"]] = relationship(back_populates="product_area")


class ReviewTopic(Base):
    __tablename__ = "review_topics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    product_area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_areas.id")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    product_area: Mapped["ProductArea | None"] = relationship(back_populates="topics")
    response_cases: Mapped[list["ResponseCase"]] = relationship(back_populates="topic")


class ResponseCase(Base):
    __tablename__ = "response_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interaction_scenarios.id"), nullable=False
    )
    sentiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sentiment_profiles.id"), nullable=False
    )
    priority_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("priority_levels.id"), nullable=False
    )
    product_area_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_areas.id"), nullable=False
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_topics.id"), nullable=False
    )
    response_policy: Mapped[str] = mapped_column(Text, nullable=False)
    approved_response_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_threshold: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0.75)
    review_policy: Mapped[str] = mapped_column(String(32), nullable=False, default="operator_required")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    interaction_scenario: Mapped["InteractionScenario"] = relationship(  # noqa: F821
        foreign_keys=[scenario_id]
    )
    sentiment_profile: Mapped["SentimentProfile"] = relationship(foreign_keys=[sentiment_id])  # noqa: F821
    priority_level: Mapped["PriorityLevel"] = relationship(foreign_keys=[priority_id])  # noqa: F821
    product_area: Mapped["ProductArea"] = relationship(back_populates="response_cases")
    topic: Mapped["ReviewTopic"] = relationship(back_populates="response_cases")
    examples: Mapped[list["ResponseCaseExample"]] = relationship(
        back_populates="response_case", cascade="all, delete-orphan"
    )


class ResponseCaseExample(Base):
    __tablename__ = "response_case_examples"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_cases.id", ondelete="CASCADE"), nullable=False
    )
    example_text: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    source_review_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id")
    )
    legacy_phrase_pattern_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    response_case: Mapped["ResponseCase"] = relationship(back_populates="examples")


class ResponseCaseCandidate(Base):
    __tablename__ = "response_case_candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    proposed_title: Mapped[str | None] = mapped_column(String(255))
    proposed_description: Mapped[str | None] = mapped_column(Text)
    proposed_scenario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interaction_scenarios.id")
    )
    proposed_sentiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sentiment_profiles.id")
    )
    proposed_priority_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("priority_levels.id")
    )
    proposed_product_area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_areas.id")
    )
    proposed_topic_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_topics.id")
    )
    proposed_response_policy: Mapped[str | None] = mapped_column(Text)
    proposed_approved_response_text: Mapped[str | None] = mapped_column(Text)
    proposed_by_operator_id: Mapped[str | None] = mapped_column(String(128))
    reviewed_by_admin_id: Mapped[str | None] = mapped_column(String(128))
    promoted_response_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_cases.id")
    )
    merged_into_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_cases.id")
    )
    rejection_comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ResponseCaseDecision(Base):
    __tablename__ = "response_case_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False
    )
    response_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_cases.id"), nullable=False
    )
    decision_source: Mapped[str] = mapped_column(String(32), nullable=False)
    match_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    is_operator_override: Mapped[bool] = mapped_column(Boolean, default=False)
    legacy_classification_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_classifications.id")
    )
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    selected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    response_case: Mapped["ResponseCase"] = relationship(foreign_keys=[response_case_id])


class CaseMatchResult(Base):
    __tablename__ = "case_match_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False
    )
    response_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_cases.id"), nullable=False
    )
    response_case_decision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_case_decisions.id")
    )
    match_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    match_method: Mapped[str] = mapped_column(String(32), nullable=False)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ResponseCaseFeedback(Base):
    __tablename__ = "response_case_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False
    )
    response_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_cases.id")
    )
    response_case_decision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_case_decisions.id")
    )
    feedback_type: Mapped[str] = mapped_column(String(32), nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(String(64))
    operator_id: Mapped[str | None] = mapped_column(String(128))
    comment: Mapped[str | None] = mapped_column(Text)
    suggested_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_cases.id")
    )
    legacy_rejection_feedback_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
