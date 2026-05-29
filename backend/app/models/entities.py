import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_external_id: Mapped[str | None] = mapped_column(String(128))
    customer_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(64))
    customer_segment: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    service_cases: Mapped[list["ServiceCase"]] = relationship(back_populates="customer")
    reviews: Mapped[list["Review"]] = relationship(back_populates="customer")


class ServiceCase(Base):
    __tablename__ = "service_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    case_type: Mapped[str | None] = mapped_column(String(64))
    case_title: Mapped[str | None] = mapped_column(String(255))
    product_area: Mapped[str | None] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)

    customer: Mapped["Customer"] = relationship(back_populates="service_cases")
    reviews: Mapped[list["Review"]] = relationship(back_populates="service_case")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    service_case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_cases.id")
    )
    review_text: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[int | None] = mapped_column(SmallInteger)
    product_area: Mapped[str | None] = mapped_column(String(128))
    order_number: Mapped[str | None] = mapped_column(String(64))
    request_sequence: Mapped[int | None] = mapped_column(Integer)
    request_number: Mapped[str | None] = mapped_column(String(80), unique=True)
    source_channel: Mapped[str | None] = mapped_column(String(64), default="web_form")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    raw_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    customer: Mapped["Customer"] = relationship(back_populates="reviews")
    service_case: Mapped["ServiceCase | None"] = relationship(back_populates="reviews")
    classifications: Mapped[list["ReviewClassification"]] = relationship(back_populates="review")
    responses: Mapped[list["ReviewResponse"]] = relationship(back_populates="review")
    evaluation_cases: Mapped[list["EvaluationCase"]] = relationship(back_populates="review")


class InteractionScenario(Base):
    __tablename__ = "interaction_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    scenario_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    required_response_elements: Mapped[str | None] = mapped_column(Text)
    forbidden_response_elements: Mapped[str | None] = mapped_column(Text)
    escalation_rules: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class SentimentProfile(Base):
    __tablename__ = "sentiment_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sentiment_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    sentiment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    tone_policy: Mapped[str | None] = mapped_column(Text)
    forbidden_tone: Mapped[str | None] = mapped_column(Text)
    escalation_hint: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class PriorityLevel(Base):
    __tablename__ = "priority_levels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    priority_code: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    priority_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ReviewPhrasePattern(Base):
    __tablename__ = "review_phrase_patterns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phrase_text: Mapped[str] = mapped_column(Text, nullable=False)
    scenario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interaction_scenarios.id")
    )
    sentiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sentiment_profiles.id")
    )
    priority_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("priority_levels.id")
    )
    # Deprecated: synced from FK on write; not used as source of truth at runtime.
    scenario: Mapped[str | None] = mapped_column(String(64))
    sentiment: Mapped[str | None] = mapped_column(String(64))
    topic: Mapped[str | None] = mapped_column(String(128))
    product_area: Mapped[str | None] = mapped_column(String(128))
    priority_hint: Mapped[str | None] = mapped_column(String(32))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    interaction_scenario: Mapped["InteractionScenario | None"] = relationship(
        foreign_keys=[scenario_id]
    )
    sentiment_profile: Mapped["SentimentProfile | None"] = relationship(foreign_keys=[sentiment_id])
    priority_level: Mapped["PriorityLevel | None"] = relationship(foreign_keys=[priority_id])


class ResponseTemplate(Base):
    __tablename__ = "response_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str | None] = mapped_column(String(255))
    scenario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interaction_scenarios.id")
    )
    sentiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sentiment_profiles.id")
    )
    priority_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("priority_levels.id")
    )
    # Deprecated string mirrors (synced on write).
    scenario: Mapped[str | None] = mapped_column(String(64))
    sentiment: Mapped[str | None] = mapped_column(String(64))
    priority: Mapped[str | None] = mapped_column(String(32))
    rating_min: Mapped[int | None] = mapped_column(SmallInteger)
    rating_max: Mapped[int | None] = mapped_column(SmallInteger)
    topic: Mapped[str | None] = mapped_column(String(128))
    product_area: Mapped[str | None] = mapped_column(String(128))
    template_text: Mapped[str] = mapped_column(Text, nullable=False)
    required_elements: Mapped[str | None] = mapped_column(Text)
    forbidden_elements: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False)

    interaction_scenario: Mapped["InteractionScenario | None"] = relationship(
        foreign_keys=[scenario_id]
    )
    sentiment_profile: Mapped["SentimentProfile | None"] = relationship(foreign_keys=[sentiment_id])
    priority_level: Mapped["PriorityLevel | None"] = relationship(foreign_keys=[priority_id])


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt_key: Mapped[str] = mapped_column(String(128), nullable=False, default="review_response_generation")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    user_prompt_template: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    # Legacy columns (Milestone 1–3 compat)
    version_number: Mapped[str | None] = mapped_column(String(32))
    prompt_text: Mapped[str | None] = mapped_column(Text)
    comment: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(128))


class ReviewClassification(Base):
    __tablename__ = "review_classifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reviews.id"))
    prompt_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prompt_versions.id")
    )
    matched_phrase_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_phrase_patterns.id")
    )
    phrase_match_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    classification_source: Mapped[str | None] = mapped_column(String(32))
    scenario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interaction_scenarios.id")
    )
    sentiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sentiment_profiles.id")
    )
    priority_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("priority_levels.id")
    )
    # Deprecated string mirrors (synced on write).
    scenario: Mapped[str | None] = mapped_column(String(64))
    sentiment: Mapped[str | None] = mapped_column(String(64))
    priority: Mapped[str | None] = mapped_column(String(32))
    topic: Mapped[str | None] = mapped_column(String(128))
    product_area: Mapped[str | None] = mapped_column(String(128))
    rating: Mapped[int | None] = mapped_column(SmallInteger)
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    needs_phrase_review: Mapped[bool] = mapped_column(Boolean, default=False)
    suggested_new_phrase: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    review: Mapped["Review"] = relationship(back_populates="classifications")
    matched_phrase: Mapped["ReviewPhrasePattern | None"] = relationship()
    prompt_version: Mapped["PromptVersion | None"] = relationship()
    responses: Mapped[list["ReviewResponse"]] = relationship(back_populates="classification")
    interaction_scenario: Mapped["InteractionScenario | None"] = relationship(
        foreign_keys=[scenario_id]
    )
    sentiment_profile: Mapped["SentimentProfile | None"] = relationship(foreign_keys=[sentiment_id])
    priority_level: Mapped["PriorityLevel | None"] = relationship(foreign_keys=[priority_id])


class ReviewResponse(Base):
    __tablename__ = "review_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reviews.id"))
    classification_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_classifications.id")
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("response_templates.id")
    )
    prompt_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prompt_versions.id")
    )
    draft_response: Mapped[str | None] = mapped_column(Text)
    final_response: Mapped[str | None] = mapped_column(Text)
    moderation_status: Mapped[str] = mapped_column(String(32), default="pending_review")
    publication_status: Mapped[str] = mapped_column(String(32), default="not_published")
    operator_id: Mapped[str | None] = mapped_column(String(128))
    generation_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    review: Mapped["Review"] = relationship(back_populates="responses")
    classification: Mapped["ReviewClassification | None"] = relationship(back_populates="responses")
    template: Mapped["ResponseTemplate | None"] = relationship()
    prompt_version: Mapped["PromptVersion | None"] = relationship()


class EvaluationCase(Base):
    __tablename__ = "evaluation_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reviews.id"))
    expected_quality_notes: Mapped[str | None] = mapped_column(Text)
    operator_score: Mapped[int | None] = mapped_column(Integer)
    operator_comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    review: Mapped["Review"] = relationship(back_populates="evaluation_cases")


class RejectionFeedback(Base):
    __tablename__ = "rejection_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reviews.id"))
    operator_id: Mapped[str] = mapped_column(String(128), default="operator-ui")
    rejection_reason: Mapped[str] = mapped_column(String(64), nullable=False)
    llm_scenario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interaction_scenarios.id")
    )
    llm_sentiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sentiment_profiles.id")
    )
    llm_priority_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("priority_levels.id")
    )
    operator_corrected_scenario_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interaction_scenarios.id")
    )
    operator_corrected_sentiment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sentiment_profiles.id")
    )
    operator_corrected_priority_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("priority_levels.id")
    )
    # Deprecated string mirrors (synced on write).
    llm_scenario: Mapped[str | None] = mapped_column(String(64))
    llm_tone: Mapped[str | None] = mapped_column(String(64))
    llm_priority: Mapped[str | None] = mapped_column(String(32))
    operator_corrected_scenario: Mapped[str | None] = mapped_column(String(64))
    operator_corrected_tone: Mapped[str | None] = mapped_column(String(64))
    operator_corrected_priority: Mapped[str | None] = mapped_column(String(32))
    optional_comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    review: Mapped["Review"] = relationship()


class OperationalLog(Base):
    __tablename__ = "operational_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(64))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    prompt_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("prompt_versions.id")
    )
    model_name: Mapped[str | None] = mapped_column(String(128))
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(String(32))
    error_message: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AIProviderSetting(Base):
    __tablename__ = "ai_provider_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    base_url_env_key: Mapped[str | None] = mapped_column(String(128))
    api_key_env_key: Mapped[str | None] = mapped_column(String(128))
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    temperature: Mapped[float | None] = mapped_column(Numeric(4, 2))
    max_tokens: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
