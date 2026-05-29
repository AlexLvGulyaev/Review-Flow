from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ch_entities import CaseMatchResult, ProductArea, ResponseCase, ResponseCaseDecision, ReviewTopic
from app.models.entities import ReviewResponse
from app.schemas.operator import ResponseCaseAlternativeOut, SelectedResponseCaseOut
from app.services.classification_refs import ClassificationRefsService
from app.services.controlled_hybrid.confidence import evaluate_confidence
from app.services.controlled_hybrid.decisions import get_current_decision


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


def is_ch_response(resp: ReviewResponse | None) -> bool:
    if not resp or not isinstance(resp.generation_metadata, dict):
        return False
    return resp.generation_metadata.get("pipeline") == "controlled_hybrid"


def ch_approve_guard(resp: ReviewResponse) -> None:
    if not is_ch_response(resp):
        return
    meta = resp.generation_metadata or {}
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


def build_selected_case_out(
    db: Session,
    decision: ResponseCaseDecision | None,
    resp: ReviewResponse | None,
) -> SelectedResponseCaseOut | None:
    if not decision:
        meta = resp.generation_metadata if resp and isinstance(resp.generation_metadata, dict) else {}
        if meta.get("suggested_response_case_id"):
            case = db.get(ResponseCase, uuid.UUID(meta["suggested_response_case_id"]))
            if case:
                band = meta.get("confidence_band")
                return _selected_from_case(
                    db,
                    case,
                    match_confidence=meta.get("match_confidence"),
                    confidence_band=band,
                    decision_source=None,
                    is_operator_override=False,
                    requires_operator_confirmation=True,
                    operator_confirmed=bool(meta.get("operator_case_confirmed")),
                )
        return None

    case = db.get(ResponseCase, decision.response_case_id)
    if not case:
        return None
    meta = resp.generation_metadata if resp and isinstance(resp.generation_metadata, dict) else {}
    band = meta.get("confidence_band")
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
        requires_operator_confirmation=bool(meta.get("requires_operator_case_confirmation")),
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
