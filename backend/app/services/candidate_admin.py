from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.ch_entities import (
    CaseMatchResult,
    ResponseCase,
    ResponseCaseCandidate,
    ResponseCaseExample,
    ResponseCaseFeedback,
)
from app.models.entities import OperationalLog, Review
from app.schemas.response_case_admin import (
    CandidateAnalysisOut,
    CandidateRetrievalLineOut,
    CandidateReviewContextOut,
    CandidateTimelineEntryOut,
    ResponseCaseCandidateDetailOut,
)
from app.services.classification_out import build_classification_out
from app.services.classification_refs import ClassificationRefsService
from app.services.controlled_hybrid.auto_learning import CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE
from app.services.controlled_hybrid.decisions import get_current_decision
from app.services.controlled_hybrid.operator_case import _retrieval_snapshot
from app.services.moderation import load_review_detail
from app.services.controlled_hybrid.candidate_learning import (
    apply_candidate_learning_classification,
    ensure_response_case_example,
)
from app.services.operational_log import log_event
from app.services.review_helpers import latest_classification, latest_response
from app.services.review_ids import customer_display_request_number


def _parse_context(description: str | None) -> dict:
    if not description:
        return {}
    text = description.strip()
    if not text.startswith("{"):
        return {"notes": text}
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else {"notes": text}
    except json.JSONDecodeError:
        return {"notes": text}


def _display_request_number(review: Review) -> str | None:
    return customer_display_request_number(
        review.request_number,
        review.order_number,
        review.request_sequence,
    )


def _retrieval_lines(db: Session, review_id: uuid.UUID, ctx: dict) -> list[CandidateRetrievalLineOut]:
    rows = db.scalars(
        select(CaseMatchResult)
        .where(CaseMatchResult.review_id == review_id)
        .order_by(CaseMatchResult.rank.asc())
    ).all()
    if rows:
        lines: list[CandidateRetrievalLineOut] = []
        for row in rows:
            case = db.get(ResponseCase, row.response_case_id)
            if not case:
                continue
            lines.append(
                CandidateRetrievalLineOut(
                    match_score=float(row.match_score),
                    title=case.title,
                    description=case.description,
                    response_case_id=case.id,
                    rank=row.rank,
                    is_selected=row.is_selected,
                )
            )
        return lines

    raw = ctx.get("retrieval_candidates") or []
    lines = []
    for idx, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            continue
        case_id = item.get("response_case_id")
        case = db.get(ResponseCase, uuid.UUID(case_id)) if case_id else None
        lines.append(
            CandidateRetrievalLineOut(
                match_score=float(item["match_score"]) if item.get("match_score") is not None else 0.0,
                title=item.get("title") or (case.title if case else "—"),
                description=case.description if case else None,
                response_case_id=case.id if case else None,
                rank=int(item.get("rank") or idx),
                is_selected=bool(item.get("is_selected")),
            )
        )
    return lines


def _operator_comment(db: Session, review_id: uuid.UUID, ctx: dict) -> str | None:
    if ctx.get("operator_comment"):
        return str(ctx["operator_comment"]).strip() or None
    fb = db.scalar(
        select(ResponseCaseFeedback)
        .where(
            ResponseCaseFeedback.review_id == review_id,
            ResponseCaseFeedback.feedback_type == "new_case_needed",
        )
        .order_by(ResponseCaseFeedback.created_at.desc())
        .limit(1)
    )
    return (fb.comment or "").strip() or None if fb else None


def _retrieval_summary(lines: list[CandidateRetrievalLineOut], ctx: dict) -> str | None:
    if not lines:
        return "Retrieval не вернул кандидатов"
    top = lines[0]
    selected = next((ln for ln in lines if ln.is_selected), None)
    parts = [f"Кандидатов: {len(lines)}", f"лучший score: {top.match_score:.2f}"]
    if selected:
        parts.append(f"выбрана: {selected.title}")
    elif ctx.get("system_selected_case_title"):
        parts.append(f"система предлагала: {ctx['system_selected_case_title']}")
    return "; ".join(parts)


def _timeline(db: Session, review_id: uuid.UUID, candidate_id: uuid.UUID) -> list[CandidateTimelineEntryOut]:
    logs = db.scalars(
        select(OperationalLog)
        .where(
            or_(
                (OperationalLog.entity_type == "review") & (OperationalLog.entity_id == review_id),
                (OperationalLog.entity_type == "response_case_candidate")
                & (OperationalLog.entity_id == candidate_id),
            )
        )
        .order_by(OperationalLog.created_at.asc())
    ).all()
    return [
        CandidateTimelineEntryOut(
            event_type=log.event_type,
            status=log.status,
            error_message=log.error_message,
            created_at=log.created_at,
        )
        for log in logs
    ]


def build_candidate_detail(db: Session, candidate_id: uuid.UUID) -> ResponseCaseCandidateDetailOut:
    candidate = db.get(ResponseCaseCandidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    review = load_review_detail(db, candidate.review_id)
    ctx = _parse_context(candidate.proposed_description)
    resp = latest_response(review)
    meta = dict(resp.generation_metadata or {}) if resp else {}
    decision = get_current_decision(db, review.id)
    snapshot = _retrieval_snapshot(db, review.id, decision)
    ctx = {**snapshot, **ctx}

    lines = _retrieval_lines(db, review.id, ctx)
    refs = ClassificationRefsService(db)
    cls_row = latest_classification(review)
    cls = build_classification_out(db, cls_row) if cls_row else None

    target_case = None
    if candidate.target_response_case_id:
        target_case = db.get(ResponseCase, candidate.target_response_case_id)

    confidence_band = meta.get("confidence_band")
    decision_source = decision.decision_source if decision else None
    match_score = float(decision.match_confidence) if decision and decision.match_confidence is not None else None
    if match_score is None and lines:
        sel = next((ln for ln in lines if ln.is_selected), lines[0])
        match_score = sel.match_score

    escalation_reason = ctx.get("escalation_reason") or meta.get("escalation_reason")
    no_case_fits = escalation_reason == "no_case_fits" or (
        candidate.candidate_type != CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE
        and "Эскалация" in (candidate.proposed_title or "")
    )

    analysis = CandidateAnalysisOut(
        escalation_reason=escalation_reason,
        no_case_fits=bool(no_case_fits),
        target_case_id=target_case.id if target_case else candidate.target_response_case_id,
        target_case_title=target_case.title if target_case else ctx.get("case_title"),
        target_case_code=target_case.case_code if target_case else ctx.get("case_code"),
        match_score=match_score,
        retrieval_threshold=float(ctx["retrieval_threshold"])
        if ctx.get("retrieval_threshold") is not None
        else (float(target_case.confidence_threshold) if target_case else None),
        gap=float(ctx["gap"]) if ctx.get("gap") is not None else None,
        confidence_band=str(confidence_band) if confidence_band else None,
        decision_source=decision_source,
        retrieval_summary=_retrieval_summary(lines, ctx),
        system_selected_case_title=ctx.get("system_selected_case_title"),
        system_selected_case_code=ctx.get("system_selected_case_code"),
    )

    review_ctx = CandidateReviewContextOut(
        review_id=review.id,
        request_number=_display_request_number(review),
        order_number=review.order_number,
        customer_name=review.customer.customer_name if review.customer else None,
        customer_email=review.customer.email if review.customer else None,
        service_case_title=review.service_case.case_title if review.service_case else None,
        product_area=review.service_case.product_area if review.service_case else None,
        rating=review.rating,
        review_text=review.review_text,
        review_created_at=review.created_at,
        operator_id=candidate.proposed_by_operator_id,
        candidate_created_at=candidate.created_at,
        classification=cls,
    )

    operator_comment = _operator_comment(db, review.id, ctx)
    if candidate.candidate_type == CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE:
        operator_comment = None

    technical_payload = {
        "candidate": {
            "id": str(candidate.id),
            "status": candidate.status,
            "candidate_type": candidate.candidate_type,
            "proposed_title": candidate.proposed_title,
            "proposed_description": candidate.proposed_description,
            "proposed_response_policy": candidate.proposed_response_policy,
            "proposed_approved_response_text": candidate.proposed_approved_response_text,
            "proposed_scenario_id": str(candidate.proposed_scenario_id) if candidate.proposed_scenario_id else None,
            "proposed_sentiment_id": str(candidate.proposed_sentiment_id) if candidate.proposed_sentiment_id else None,
            "proposed_priority_id": str(candidate.proposed_priority_id) if candidate.proposed_priority_id else None,
            "proposed_product_area_id": str(candidate.proposed_product_area_id)
            if candidate.proposed_product_area_id
            else None,
            "proposed_topic_id": str(candidate.proposed_topic_id) if candidate.proposed_topic_id else None,
        },
        "parsed_context": ctx,
        "generation_metadata": meta,
        "decision": {
            "id": str(decision.id),
            "response_case_id": str(decision.response_case_id),
            "decision_source": decision.decision_source,
            "match_confidence": float(decision.match_confidence) if decision.match_confidence is not None else None,
        }
        if decision
        else None,
    }

    return ResponseCaseCandidateDetailOut(
        id=candidate.id,
        review_id=candidate.review_id,
        status=candidate.status,
        candidate_type=candidate.candidate_type,
        proposed_title=candidate.proposed_title,
        target_response_case_id=candidate.target_response_case_id,
        review=review_ctx,
        analysis=analysis,
        retrieval_alternatives=lines,
        operator_comment=operator_comment,
        timeline=_timeline(db, review.id, candidate.id),
        technical_payload=technical_payload,
        prefill={
            "title": candidate.proposed_title or "",
            "description": ctx.get("notes") or (candidate.proposed_description if not ctx.get("escalation_reason") else ""),
            "scenario_id": str(candidate.proposed_scenario_id or ctx.get("operator_scenario_id") or ""),
            "sentiment_id": str(candidate.proposed_sentiment_id or ctx.get("operator_sentiment_id") or ""),
            "priority_id": str(candidate.proposed_priority_id or ctx.get("operator_priority_id") or ""),
            "product_area_id": str(candidate.proposed_product_area_id or ""),
            "topic_id": str(candidate.proposed_topic_id or ""),
            "response_policy": candidate.proposed_response_policy or "",
            "approved_response_text": candidate.proposed_approved_response_text or "",
        },
    )


def complete_candidate_with_case(
    db: Session,
    candidate_id: uuid.UUID,
    *,
    response_case_id: uuid.UUID,
    admin_id: str = "admin-ui",
) -> None:
    candidate = db.get(ResponseCaseCandidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status not in ("pending_admin", "pending_operator", "new"):
        raise HTTPException(status_code=400, detail=f"Candidate status is {candidate.status}")

    case = db.get(ResponseCase, response_case_id)
    if not case or not case.is_active:
        raise HTTPException(status_code=404, detail="Response case not found or inactive")

    review = db.get(Review, candidate.review_id)
    now = datetime.now(timezone.utc)

    if review:
        ensure_response_case_example(
            db, response_case_id=case.id, review=review, now=now
        )
        apply_candidate_learning_classification(
            db,
            review=review,
            response_case=case,
            preserve_published_response=True,
        )

    candidate.status = "approved"
    candidate.promoted_response_case_id = case.id
    candidate.reviewed_by_admin_id = admin_id
    candidate.updated_at = now
    db.flush()
    log_event(
        db,
        event_type="case_candidate_promoted",
        entity_type="response_case_candidate",
        entity_id=candidate.id,
        status="ok",
        metadata={"response_case_id": str(case.id), "source": "admin_modal_create"},
    )
    db.commit()
