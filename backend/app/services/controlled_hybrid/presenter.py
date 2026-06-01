from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ch_entities import (
    CaseMatchResult,
    ProductArea,
    ResponseCase,
    ResponseCaseCandidate,
    ResponseCaseDecision,
    ResponseCaseFeedback,
    ReviewTopic,
)
from app.models.entities import OperationalLog, ReviewResponse
from app.schemas.operator import ResponseCaseAlternativeOut, RetrievalSuggestionOut, SelectedResponseCaseOut
from app.services.classification_refs import ClassificationRefsService
from app.services.controlled_hybrid.candidate_learning import (
    DECISION_SOURCE_CANDIDATE_LEARNING,
    DECISION_SOURCE_CANDIDATE_MERGE,
)
from app.services.controlled_hybrid.decisions import get_current_decision
from app.services.review_helpers import latest_classification


NO_CASE_FITS_ESCALATION = "no_case_fits"


def is_no_case_fits_state(db: Session, review_id: uuid.UUID, meta: dict) -> bool:
    """True when operator escalated with no_case_fits and has not picked a final TS."""
    decision = get_current_decision(db, review_id)
    if decision:
        if decision.decision_source in (
            DECISION_SOURCE_CANDIDATE_LEARNING,
            DECISION_SOURCE_CANDIDATE_MERGE,
        ):
            return False
        if decision.is_operator_override:
            return False
    if meta.get("escalation_reason") == NO_CASE_FITS_ESCALATION or meta.get("case_escalated"):
        return True
    return infer_ch_escalation_flags(db, review_id, meta)["case_escalated"]


def resolve_operator_list_classification(
    db: Session,
    review,
    resp: ReviewResponse | None,
    refs: ClassificationRefsService,
) -> tuple[str | None, str | None, str | None]:
    """Scenario/sentiment/priority codes for operator queue filters."""
    if resp and is_ch_response(resp):
        meta = resp.generation_metadata if isinstance(resp.generation_metadata, dict) else {}
        if is_no_case_fits_state(db, review.id, meta):
            cls = latest_classification(review)
            if cls:
                scenario_code = refs.code_for_scenario_id(cls.scenario_id) if cls.scenario_id else cls.scenario
                sentiment_code = refs.code_for_sentiment_id(cls.sentiment_id) if cls.sentiment_id else cls.sentiment
                priority_code = refs.code_for_priority_id(cls.priority_id) if cls.priority_id else cls.priority
                return scenario_code, sentiment_code, priority_code
            return None, None, None

        decision = get_current_decision(db, review.id)
        if decision:
            case = db.get(ResponseCase, decision.response_case_id)
            if case:
                return (
                    refs.code_for_scenario_id(case.scenario_id),
                    refs.code_for_sentiment_id(case.sentiment_id),
                    refs.code_for_priority_id(case.priority_id),
                )
        suggested_id = meta.get("suggested_response_case_id")
        if suggested_id:
            case = db.get(ResponseCase, uuid.UUID(str(suggested_id)))
            if case:
                return (
                    refs.code_for_scenario_id(case.scenario_id),
                    refs.code_for_sentiment_id(case.sentiment_id),
                    refs.code_for_priority_id(case.priority_id),
                )

    cls = latest_classification(review)
    if not cls:
        return None, None, None
    scenario_code = refs.code_for_scenario_id(cls.scenario_id) if cls.scenario_id else cls.scenario
    sentiment_code = refs.code_for_sentiment_id(cls.sentiment_id) if cls.sentiment_id else cls.sentiment
    priority_code = refs.code_for_priority_id(cls.priority_id) if cls.priority_id else cls.priority
    return scenario_code, sentiment_code, priority_code


def _area_topic_refs(db: Session, case: ResponseCase) -> tuple:
    from app.schemas.reference import ClassificationRefOut

    pa = db.get(ProductArea, case.product_area_id) if case.product_area_id else None
    topic = db.get(ReviewTopic, case.topic_id) if case.topic_id else None
    pa_out = ClassificationRefOut(id=pa.id, code=pa.code, name=pa.name) if pa else None
    topic_out = ClassificationRefOut(id=topic.id, code=topic.code, name=topic.name) if topic else None
    return pa_out, topic_out


def _selected_from_case(
    db: Session,
    case: ResponseCase,
    *,
    match_confidence: float | None,
    confidence_band: str | None,
    decision_source: str | None,
    is_operator_override: bool,
    requires_operator_confirmation: bool,
    operator_confirmed: bool,
) -> SelectedResponseCaseOut:
    refs = ClassificationRefsService(db)
    pa_out, topic_out = _area_topic_refs(db, case)
    return SelectedResponseCaseOut(
        response_case_id=case.id,
        case_code=case.case_code,
        title=case.title,
        description=case.description,
        product_area=pa_out,
        topic=topic_out,
        match_confidence=match_confidence,
        confidence_threshold=float(case.confidence_threshold),
        confidence_band=confidence_band,
        decision_source=decision_source,
        is_operator_override=is_operator_override,
        requires_operator_confirmation=requires_operator_confirmation,
        operator_confirmed=operator_confirmed,
        response_policy=case.response_policy,
        approved_response_text=case.approved_response_text,
        review_policy=case.review_policy,
        scenario=refs.ref_for_scenario_id(case.scenario_id),
        sentiment=refs.ref_for_sentiment_id(case.sentiment_id),
        priority=refs.ref_for_priority_id(case.priority_id),
    )


def infer_ch_escalation_flags(
    db: Session,
    review_id: uuid.UUID,
    meta: dict,
    *,
    logs: list | None = None,
) -> dict[str, bool]:
    """Resolve escalation state; infers legacy rows missing 024G1 metadata flags."""
    case_escalated = bool(meta.get("case_escalated"))
    case_confirmation_not_required = bool(meta.get("case_confirmation_not_required"))
    operator_editor_enabled = bool(meta.get("operator_editor_enabled"))

    if case_escalated and case_confirmation_not_required:
        return {
            "case_escalated": True,
            "case_confirmation_not_required": True,
            "operator_editor_enabled": operator_editor_enabled or True,
        }

    inferred_no_case_fits = False

    if logs is not None:
        for log in reversed(logs):
            md = getattr(log, "metadata_", None) or {}
            if (
                log.event_type == "operator_case_escalated"
                and md.get("escalation_reason") == NO_CASE_FITS_ESCALATION
            ):
                inferred_no_case_fits = True
                break
    else:
        row = db.scalar(
            select(OperationalLog)
            .where(
                OperationalLog.entity_type == "review",
                OperationalLog.entity_id == review_id,
                OperationalLog.event_type == "operator_case_escalated",
            )
            .order_by(OperationalLog.created_at.desc())
            .limit(1)
        )
        if row and (row.metadata_ or {}).get("escalation_reason") == NO_CASE_FITS_ESCALATION:
            inferred_no_case_fits = True

    if not inferred_no_case_fits:
        candidate = db.scalar(
            select(ResponseCaseCandidate)
            .where(
                ResponseCaseCandidate.review_id == review_id,
                ResponseCaseCandidate.status.in_(("new", "pending_admin")),
            )
            .order_by(ResponseCaseCandidate.created_at.desc())
            .limit(1)
        )
        if candidate and candidate.proposed_title and "Эскалация" in candidate.proposed_title:
            inferred_no_case_fits = True

    if not inferred_no_case_fits:
        feedback = db.scalar(
            select(ResponseCaseFeedback)
            .where(
                ResponseCaseFeedback.review_id == review_id,
                ResponseCaseFeedback.rejection_reason == NO_CASE_FITS_ESCALATION,
            )
            .order_by(ResponseCaseFeedback.created_at.desc())
            .limit(1)
        )
        if feedback:
            inferred_no_case_fits = True

    if inferred_no_case_fits:
        return {
            "case_escalated": True,
            "case_confirmation_not_required": True,
            "operator_editor_enabled": True,
        }

    return {
        "case_escalated": case_escalated,
        "case_confirmation_not_required": case_confirmation_not_required,
        "operator_editor_enabled": operator_editor_enabled,
    }


def is_ch_response(resp: ReviewResponse | None) -> bool:
    if not resp or not isinstance(resp.generation_metadata, dict):
        return False
    return resp.generation_metadata.get("pipeline") == "controlled_hybrid"


def ch_approve_guard(
    resp: ReviewResponse,
    db: Session | None = None,
    review_id: uuid.UUID | None = None,
) -> None:
    if not is_ch_response(resp):
        return
    meta = resp.generation_metadata or {}
    confirmation_not_required = bool(meta.get("case_confirmation_not_required"))
    if not confirmation_not_required and db is not None and review_id is not None:
        confirmation_not_required = infer_ch_escalation_flags(db, review_id, meta)[
            "case_confirmation_not_required"
        ]
    if not confirmation_not_required:
        if meta.get("requires_operator_case_confirmation") and not meta.get("operator_case_confirmed"):
            raise HTTPException(
                status_code=409,
                detail="Operator must confirm the response case before approval",
            )
        if not meta.get("response_case_id"):
            raise HTTPException(
                status_code=409,
                detail="No response case selected for this review",
            )


def _match_score_for_case(
    db: Session,
    review_id: uuid.UUID | None,
    case_id: uuid.UUID,
    meta: dict,
) -> float | None:
    if meta.get("match_confidence") is not None:
        return float(meta["match_confidence"])
    if not review_id:
        return None
    row = db.scalar(
        select(CaseMatchResult)
        .where(
            CaseMatchResult.review_id == review_id,
            CaseMatchResult.response_case_id == case_id,
        )
        .order_by(CaseMatchResult.rank.asc())
        .limit(1)
    )
    return float(row.match_score) if row else None


def build_retrieval_suggestion_out(
    db: Session,
    review_id: uuid.UUID | None,
    resp: ReviewResponse | None,
) -> RetrievalSuggestionOut | None:
    meta = resp.generation_metadata if resp and isinstance(resp.generation_metadata, dict) else {}
    stored = meta.get("retrieval_suggestion")
    rejected = is_no_case_fits_state(db, review_id, meta) if review_id else bool(meta.get("case_escalated"))
    rejection_reason = NO_CASE_FITS_ESCALATION if rejected else None

    if isinstance(stored, dict) and stored.get("title"):
        case_id = stored.get("response_case_id")
        return RetrievalSuggestionOut(
            response_case_id=uuid.UUID(str(case_id)) if case_id else None,
            case_code=stored.get("case_code"),
            title=stored.get("title"),
            match_score=float(stored["match_score"]) if stored.get("match_score") is not None else None,
            operator_rejected=rejected,
            rejection_reason=rejection_reason,
        )

    if not review_id:
        return None

    top = db.scalar(
        select(CaseMatchResult)
        .where(CaseMatchResult.review_id == review_id)
        .order_by(CaseMatchResult.rank.asc())
        .limit(1)
    )
    if not top:
        return None
    case = db.get(ResponseCase, top.response_case_id)
    if not case:
        return None
    return RetrievalSuggestionOut(
        response_case_id=case.id,
        case_code=case.case_code,
        title=case.title,
        match_score=float(top.match_score),
        operator_rejected=rejected,
        rejection_reason=rejection_reason,
    )


def build_selected_case_out(
    db: Session,
    decision: ResponseCaseDecision | None,
    resp: ReviewResponse | None,
    review_id: uuid.UUID | None = None,
) -> SelectedResponseCaseOut | None:
    meta = resp.generation_metadata if resp and isinstance(resp.generation_metadata, dict) else {}

    if review_id and is_no_case_fits_state(db, review_id, meta):
        if decision and decision.is_operator_override:
            pass
        else:
            return None

    if not decision:
        confirmation_not_required = bool(meta.get("case_confirmation_not_required"))
        if review_id and not confirmation_not_required:
            confirmation_not_required = infer_ch_escalation_flags(db, review_id, meta)[
                "case_confirmation_not_required"
            ]
        if meta.get("suggested_response_case_id"):
            case = db.get(ResponseCase, uuid.UUID(meta["suggested_response_case_id"]))
            if case:
                band = meta.get("confidence_band")
                requires_confirmation = (
                    bool(meta.get("requires_operator_case_confirmation")) and not confirmation_not_required
                )
                match_confidence = _match_score_for_case(
                    db,
                    review_id,
                    case.id,
                    meta,
                )
                return _selected_from_case(
                    db,
                    case,
                    match_confidence=match_confidence,
                    confidence_band=band,
                    decision_source=meta.get("decision_source") or "retrieval_suggested",
                    is_operator_override=False,
                    requires_operator_confirmation=requires_confirmation,
                    operator_confirmed=bool(meta.get("operator_case_confirmed")),
                )
        return None

    case = db.get(ResponseCase, decision.response_case_id)
    if not case:
        return None
    band = meta.get("confidence_band")
    confirmation_not_required = bool(meta.get("case_confirmation_not_required"))
    if review_id and not confirmation_not_required:
        confirmation_not_required = infer_ch_escalation_flags(db, review_id, meta)[
            "case_confirmation_not_required"
        ]
    requires_confirmation = bool(meta.get("requires_operator_case_confirmation")) and not confirmation_not_required
    if decision.match_confidence is not None and not band:
        band = evaluate_confidence(
            float(decision.match_confidence), case.confidence_threshold
        ).band.value
    return _selected_from_case(
        db,
        case,
        match_confidence=float(decision.match_confidence) if decision.match_confidence is not None else None,
        confidence_band=band,
        decision_source=decision.decision_source,
        is_operator_override=decision.is_operator_override,
        requires_operator_confirmation=requires_confirmation,
        operator_confirmed=bool(meta.get("operator_case_confirmed")),
    )


def build_case_alternatives(db: Session, review_id: uuid.UUID) -> list[ResponseCaseAlternativeOut]:
    rows = db.scalars(
        select(CaseMatchResult)
        .where(CaseMatchResult.review_id == review_id)
        .order_by(CaseMatchResult.rank.asc())
    ).all()
    out: list[ResponseCaseAlternativeOut] = []
    for row in rows:
        case = db.get(ResponseCase, row.response_case_id)
        if not case:
            continue
        out.append(
            ResponseCaseAlternativeOut(
                response_case_id=case.id,
                case_code=case.case_code,
                title=case.title,
                description=case.description,
                match_score=float(row.match_score),
                rank=row.rank,
                is_selected=row.is_selected,
            )
        )
    return out
