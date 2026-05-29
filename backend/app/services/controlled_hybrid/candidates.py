from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.ch_entities import ResponseCase, ResponseCaseCandidate, ResponseCaseExample
from app.schemas.response_case import ResponseCaseOut
from app.schemas.response_case_admin import ResponseCaseCandidateOut
from app.services.controlled_hybrid.decisions import create_decision
from app.services.controlled_hybrid.draft_generation import CaseDraftGenerationService
from app.services.controlled_hybrid.retrieval import ResponseCaseRetrievalService
from app.services.ai_provider_runtime import AIProviderRuntime
from app.services.operational_log import log_event
from app.services.response_cases import ResponseCaseService
from app.models.entities import Review, ReviewResponse
from app.services.review_helpers import latest_response


def promote_candidate(
    db: Session,
    candidate_id: uuid.UUID,
    *,
    admin_id: str = "admin-ui",
    merge_into_case_id: uuid.UUID | None = None,
) -> ResponseCaseOut:
    candidate = db.get(ResponseCaseCandidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status not in ("pending_admin", "pending_operator"):
        raise HTTPException(status_code=400, detail=f"Candidate status is {candidate.status}")

    now = datetime.now(timezone.utc)
    if merge_into_case_id:
        target = db.get(ResponseCase, merge_into_case_id)
        if not target or not target.is_active:
            raise HTTPException(status_code=404, detail="Target response case not found")
        review = db.get(Review, candidate.review_id)
        if review:
            example = ResponseCaseExample(
                response_case_id=target.id,
                example_text=review.review_text,
                source="from_review",
                source_review_id=review.id,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(example)
        candidate.status = "merged"
        candidate.merged_into_case_id = target.id
        candidate.reviewed_by_admin_id = admin_id
        candidate.updated_at = now
        db.flush()
        log_event(
            db,
            event_type="case_candidate_merged",
            entity_type="response_case_candidate",
            entity_id=candidate.id,
            status="ok",
            metadata={"merged_into_case_id": str(target.id)},
        )
        db.commit()
        out = ResponseCaseService(db).get_case(target.id)
        if not out:
            raise HTTPException(status_code=500, detail="Failed to load merged case")
        return out

    if not candidate.proposed_title or not candidate.proposed_approved_response_text:
        raise HTTPException(status_code=400, detail="Candidate missing required fields for promotion")

    required_fks = [
        candidate.proposed_scenario_id,
        candidate.proposed_sentiment_id,
        candidate.proposed_priority_id,
        candidate.proposed_product_area_id,
        candidate.proposed_topic_id,
    ]
    if not all(required_fks):
        raise HTTPException(status_code=400, detail="Candidate missing classification or topic FKs")

    case_code = f"candidate_{str(candidate.id)[:8]}"
    case = ResponseCase(
        case_code=case_code,
        title=candidate.proposed_title,
        description=candidate.proposed_description,
        scenario_id=candidate.proposed_scenario_id,
        sentiment_id=candidate.proposed_sentiment_id,
        priority_id=candidate.proposed_priority_id,
        product_area_id=candidate.proposed_product_area_id,
        topic_id=candidate.proposed_topic_id,
        response_policy=candidate.proposed_response_policy or "Follow standard tone.",
        approved_response_text=candidate.proposed_approved_response_text,
        created_by="candidate_promote",
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(case)
    db.flush()

    review = db.get(Review, candidate.review_id)
    if review:
        db.add(
            ResponseCaseExample(
                response_case_id=case.id,
                example_text=review.review_text,
                source="from_review",
                source_review_id=review.id,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )

    candidate.status = "approved"
    candidate.promoted_response_case_id = case.id
    candidate.reviewed_by_admin_id = admin_id
    candidate.updated_at = now

    if review:
        retrieval = ResponseCaseRetrievalService(db).retrieve(review.review_text)
        match_score = 1.0
        for c in retrieval.candidates:
            if c.response_case.id == case.id:
                match_score = c.match_score
                break
        decision = create_decision(
            db,
            review_id=review.id,
            response_case=case,
            match_score=match_score,
            decision_source="manual_seed",
        )
        resp = latest_response(review)
        customer_name = review.customer.customer_name if review.customer else "Клиент"
        if resp:
            resolved = AIProviderRuntime(db).resolve(review_id=review.id)
            draft, _, gen_prompt, gen_metadata = CaseDraftGenerationService(db, resolved).generate(
                review=review,
                response_case=case,
                customer_name=customer_name,
            )
            gen_metadata["operator_case_confirmed"] = True
            gen_metadata["requires_operator_case_confirmation"] = False
            gen_metadata["confidence_band"] = "high"
            resp.draft_response = draft
            resp.prompt_version_id = gen_prompt.id
            resp.generation_metadata = gen_metadata
            resp.updated_at = now

    log_event(
        db,
        event_type="case_candidate_promoted",
        entity_type="response_case_candidate",
        entity_id=candidate.id,
        status="ok",
        metadata={"response_case_id": str(case.id)},
    )
    db.commit()

    out = ResponseCaseService(db).get_case(case.id)
    if not out:
        raise HTTPException(status_code=500, detail="Failed to load promoted case")
    return out


def reject_candidate(
    db: Session,
    candidate_id: uuid.UUID,
    *,
    admin_id: str = "admin-ui",
    rejection_comment: str | None = None,
) -> ResponseCaseCandidateOut:
    candidate = db.get(ResponseCaseCandidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status not in ("pending_admin", "pending_operator"):
        raise HTTPException(status_code=400, detail=f"Candidate status is {candidate.status}")

    now = datetime.now(timezone.utc)
    candidate.status = "rejected"
    candidate.rejection_comment = rejection_comment
    candidate.reviewed_by_admin_id = admin_id
    candidate.updated_at = now
    db.flush()
    log_event(
        db,
        event_type="case_candidate_rejected",
        entity_type="response_case_candidate",
        entity_id=candidate.id,
        status="ok",
    )
    db.commit()
    return ResponseCaseCandidateOut(
        id=candidate.id,
        review_id=candidate.review_id,
        status=candidate.status,
        proposed_title=candidate.proposed_title,
        proposed_description=candidate.proposed_description,
        proposed_response_policy=candidate.proposed_response_policy,
        proposed_approved_response_text=candidate.proposed_approved_response_text,
        proposed_by_operator_id=candidate.proposed_by_operator_id,
        proposed_scenario_id=candidate.proposed_scenario_id,
        proposed_sentiment_id=candidate.proposed_sentiment_id,
        proposed_priority_id=candidate.proposed_priority_id,
        proposed_product_area_id=candidate.proposed_product_area_id,
        proposed_topic_id=candidate.proposed_topic_id,
        rejection_comment=candidate.rejection_comment,
        promoted_response_case_id=candidate.promoted_response_case_id,
        merged_into_case_id=candidate.merged_into_case_id,
        created_at=candidate.created_at.isoformat(),
        updated_at=candidate.updated_at.isoformat() if candidate.updated_at else None,
    )
