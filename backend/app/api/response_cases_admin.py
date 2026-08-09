from uuid import UUID

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.roles import require_admin
from app.db.session import get_db
from app.models.ch_entities import ResponseCaseCandidate
from app.schemas.response_case import ResponseCaseExampleOut, ResponseCaseOut
from app.schemas.response_case_admin import (
    CandidateCompleteBody,
    CandidatePromoteBody,
    CandidateRejectBody,
    ChCatalogOut,
    ResponseCaseCandidateDetailOut,
    ResponseCaseCandidateOut,
    ResponseCaseCreate,
    ResponseCaseExampleCreate,
    ResponseCaseExampleUpdate,
    ResponseCaseListItemAdmin,
    ResponseCaseUpdate,
)
from app.services.controlled_hybrid.auto_learning import CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE
from app.services.candidate_admin import build_candidate_detail, complete_candidate_with_case
from app.services.controlled_hybrid.candidates import promote_candidate, reject_candidate
from app.services.response_cases import ResponseCaseService

router = APIRouter(
    prefix="/api/admin",
    tags=["admin-response-cases"],
    dependencies=[Depends(require_admin)],
)


def _learning_metrics(row: ResponseCaseCandidate) -> tuple[float | None, float | None, float | None]:
    if row.candidate_type != CANDIDATE_TYPE_RESPONSE_CASE_EXAMPLE or not row.proposed_description:
        return None, None, None
    try:
        data = json.loads(row.proposed_description)
    except json.JSONDecodeError:
        return None, None, None
    return (
        float(data["match_score"]) if data.get("match_score") is not None else None,
        float(data["retrieval_threshold"]) if data.get("retrieval_threshold") is not None else None,
        float(data["gap"]) if data.get("gap") is not None else None,
    )


def _candidate_out(row: ResponseCaseCandidate) -> ResponseCaseCandidateOut:
    match_score, retrieval_threshold, gap = _learning_metrics(row)
    return ResponseCaseCandidateOut(
        id=row.id,
        review_id=row.review_id,
        status=row.status,
        candidate_type=row.candidate_type,
        target_response_case_id=row.target_response_case_id,
        proposed_title=row.proposed_title,
        proposed_description=row.proposed_description,
        proposed_response_policy=row.proposed_response_policy,
        proposed_approved_response_text=row.proposed_approved_response_text,
        proposed_by_operator_id=row.proposed_by_operator_id,
        proposed_scenario_id=row.proposed_scenario_id,
        proposed_sentiment_id=row.proposed_sentiment_id,
        proposed_priority_id=row.proposed_priority_id,
        proposed_product_area_id=row.proposed_product_area_id,
        proposed_topic_id=row.proposed_topic_id,
        rejection_comment=row.rejection_comment,
        promoted_response_case_id=row.promoted_response_case_id,
        merged_into_case_id=row.merged_into_case_id,
        match_score=match_score,
        retrieval_threshold=retrieval_threshold,
        gap=gap,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat() if row.updated_at else None,
    )


@router.get("/ch-catalog", response_model=ChCatalogOut)
def get_ch_catalog(db: Session = Depends(get_db)) -> ChCatalogOut:
    svc = ResponseCaseService(db)
    areas, topics, policies = svc.list_catalog()
    return ChCatalogOut(
        product_areas=[svc._product_area_out(a) for a in areas],
        review_topics=[svc._topic_out(t) for t in topics],
        processing_policies=[svc._processing_policy_out(p) for p in policies],
    )


@router.get("/response-cases", response_model=list[ResponseCaseListItemAdmin])
def list_response_cases(
    is_active: bool | None = Query(None),
    scenario_id: UUID | None = None,
    sentiment_id: UUID | None = None,
    priority_id: UUID | None = None,
    product_area_id: UUID | None = None,
    topic_id: UUID | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
) -> list[ResponseCaseListItemAdmin]:
    svc = ResponseCaseService(db)
    return svc.list_cases_admin(
        is_active=is_active,
        scenario_id=scenario_id,
        sentiment_id=sentiment_id,
        priority_id=priority_id,
        product_area_id=product_area_id,
        topic_id=topic_id,
        search=search,
    )


@router.post("/response-cases", response_model=ResponseCaseOut, status_code=201)
def create_response_case(body: ResponseCaseCreate, db: Session = Depends(get_db)) -> ResponseCaseOut:
    return ResponseCaseService(db).create_case(body)


@router.get("/response-cases/{case_id}", response_model=ResponseCaseOut)
def get_response_case(case_id: UUID, db: Session = Depends(get_db)) -> ResponseCaseOut:
    svc = ResponseCaseService(db)
    row = svc.get_case(case_id, include_inactive_examples=True)
    if not row:
        raise HTTPException(status_code=404, detail="Response case not found")
    return row


@router.patch("/response-cases/{case_id}", response_model=ResponseCaseOut)
def update_response_case(
    case_id: UUID, body: ResponseCaseUpdate, db: Session = Depends(get_db)
) -> ResponseCaseOut:
    return ResponseCaseService(db).update_case(case_id, body)


@router.post("/response-cases/{case_id}/archive", response_model=ResponseCaseOut)
def archive_response_case(case_id: UUID, db: Session = Depends(get_db)) -> ResponseCaseOut:
    return ResponseCaseService(db).set_case_active(case_id, is_active=False)


@router.post("/response-cases/{case_id}/activate", response_model=ResponseCaseOut)
def activate_response_case(case_id: UUID, db: Session = Depends(get_db)) -> ResponseCaseOut:
    return ResponseCaseService(db).set_case_active(case_id, is_active=True)


@router.post(
    "/response-cases/{case_id}/examples",
    response_model=ResponseCaseExampleOut,
    status_code=201,
)
def create_response_case_example(
    case_id: UUID, body: ResponseCaseExampleCreate, db: Session = Depends(get_db)
) -> ResponseCaseExampleOut:
    return ResponseCaseService(db).create_example(case_id, body)


@router.patch("/response-case-examples/{example_id}", response_model=ResponseCaseExampleOut)
def update_response_case_example(
    example_id: UUID, body: ResponseCaseExampleUpdate, db: Session = Depends(get_db)
) -> ResponseCaseExampleOut:
    return ResponseCaseService(db).update_example(example_id, body)


@router.get("/response-case-candidates", response_model=list[ResponseCaseCandidateOut])
def list_response_case_candidates(
    status: str | None = Query("pending_admin"),
    db: Session = Depends(get_db),
) -> list[ResponseCaseCandidateOut]:
    stmt = select(ResponseCaseCandidate).order_by(ResponseCaseCandidate.created_at.desc())
    if status:
        if status == "pending_admin":
            stmt = stmt.where(ResponseCaseCandidate.status.in_(("pending_admin", "new")))
        else:
            stmt = stmt.where(ResponseCaseCandidate.status == status)
    rows = db.scalars(stmt).all()
    return [_candidate_out(r) for r in rows]


@router.get("/response-case-candidates/{candidate_id}", response_model=ResponseCaseCandidateDetailOut)
def get_response_case_candidate(
    candidate_id: UUID,
    db: Session = Depends(get_db),
) -> ResponseCaseCandidateDetailOut:
    return build_candidate_detail(db, candidate_id)


@router.post("/response-case-candidates/{candidate_id}/complete", status_code=204)
def complete_response_case_candidate(
    candidate_id: UUID,
    body: CandidateCompleteBody,
    db: Session = Depends(get_db),
) -> None:
    complete_candidate_with_case(db, candidate_id, response_case_id=body.response_case_id)


@router.post("/response-case-candidates/{candidate_id}/approve", response_model=ResponseCaseOut)
def approve_response_case_candidate(
    candidate_id: UUID,
    body: CandidatePromoteBody | None = None,
    db: Session = Depends(get_db),
) -> ResponseCaseOut:
    merge_id = body.merge_into_case_id if body else None
    return promote_candidate(db, candidate_id, merge_into_case_id=merge_id)


@router.post("/response-case-candidates/{candidate_id}/reject", response_model=ResponseCaseCandidateOut)
def reject_response_case_candidate(
    candidate_id: UUID,
    body: CandidateRejectBody | None = None,
    db: Session = Depends(get_db),
) -> ResponseCaseCandidateOut:
    comment = body.rejection_comment if body else None
    return reject_candidate(db, candidate_id, rejection_comment=comment)
