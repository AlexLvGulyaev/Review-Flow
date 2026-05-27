from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.roles import require_admin
from app.db.session import get_db
from app.models.entities import (
    InteractionScenario,
    ReviewPhrasePattern,
    ResponseTemplate,
    SentimentProfile,
)
from app.schemas.admin import (
    PhraseCreate,
    PhraseOut,
    PhraseUpdate,
    ScenarioCreate,
    ScenarioOut,
    ScenarioUpdate,
    SentimentCreate,
    SentimentOut,
    SentimentUpdate,
    TemplateCreate,
    TemplateOut,
    TemplateUpdate,
)
from app.services.operational_log import log_event

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


def _phrase_out(p: ReviewPhrasePattern) -> PhraseOut:
    return PhraseOut(
        id=p.id,
        phrase_text=p.phrase_text,
        scenario=p.scenario,
        sentiment=p.sentiment,
        priority=p.priority_hint,
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def _template_out(t: ResponseTemplate) -> TemplateOut:
    return TemplateOut(
        id=t.id,
        title=t.title,
        scenario=t.scenario,
        sentiment=t.sentiment,
        priority=t.priority,
        template_text=t.template_text,
        is_fallback=t.is_fallback,
        is_active=t.is_active,
    )


def _scenario_out(s: InteractionScenario) -> ScenarioOut:
    return ScenarioOut(
        id=s.id,
        code=s.scenario_code,
        title=s.scenario_name,
        description=s.description,
        is_active=s.is_active,
    )


def _sentiment_out(s: SentimentProfile) -> SentimentOut:
    desc = s.description or s.tone_policy
    return SentimentOut(
        id=s.id,
        code=s.sentiment_code,
        title=s.sentiment_name,
        description=desc,
        is_active=s.is_active,
    )


# --- Phrases ---


@router.get("/phrases", response_model=list[PhraseOut])
def list_phrases(db: Session = Depends(get_db)) -> list[PhraseOut]:
    rows = db.scalars(
        select(ReviewPhrasePattern).order_by(ReviewPhrasePattern.created_at.desc())
    ).all()
    return [_phrase_out(p) for p in rows]


@router.get("/phrases/{item_id}", response_model=PhraseOut)
def get_phrase(item_id: UUID, db: Session = Depends(get_db)) -> PhraseOut:
    p = db.get(ReviewPhrasePattern, item_id)
    if not p:
        raise HTTPException(404, "Phrase not found")
    return _phrase_out(p)


@router.post("/phrases", response_model=PhraseOut, status_code=201)
def create_phrase(body: PhraseCreate, db: Session = Depends(get_db)) -> PhraseOut:
    now = datetime.now(timezone.utc)
    p = ReviewPhrasePattern(
        phrase_text=body.phrase_text,
        scenario=body.scenario,
        sentiment=body.sentiment,
        priority_hint=body.priority,
        is_active=body.is_active,
        created_at=now,
        updated_at=now,
    )
    db.add(p)
    db.flush()
    log_event(
        db,
        event_type="admin_phrase_created",
        status="ok",
        metadata={"phrase_id": str(p.id)},
    )
    db.commit()
    db.refresh(p)
    return _phrase_out(p)


@router.patch("/phrases/{item_id}", response_model=PhraseOut)
def update_phrase(
    item_id: UUID, body: PhraseUpdate, db: Session = Depends(get_db)
) -> PhraseOut:
    p = db.get(ReviewPhrasePattern, item_id)
    if not p:
        raise HTTPException(404, "Phrase not found")
    data = body.model_dump(exclude_unset=True)
    if "priority" in data:
        p.priority_hint = data.pop("priority")
    for key, val in data.items():
        setattr(p, key, val)
    p.updated_at = datetime.now(timezone.utc)
    log_event(
        db,
        event_type="admin_phrase_updated",
        status="ok",
        metadata={"phrase_id": str(p.id)},
    )
    db.commit()
    db.refresh(p)
    return _phrase_out(p)


# --- Templates ---


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)) -> list[TemplateOut]:
    rows = db.scalars(select(ResponseTemplate).order_by(ResponseTemplate.title)).all()
    return [_template_out(t) for t in rows]


@router.get("/templates/{item_id}", response_model=TemplateOut)
def get_template(item_id: UUID, db: Session = Depends(get_db)) -> TemplateOut:
    t = db.get(ResponseTemplate, item_id)
    if not t:
        raise HTTPException(404, "Template not found")
    return _template_out(t)


@router.post("/templates", response_model=TemplateOut, status_code=201)
def create_template(body: TemplateCreate, db: Session = Depends(get_db)) -> TemplateOut:
    t = ResponseTemplate(
        title=body.title,
        scenario=body.scenario,
        sentiment=body.sentiment,
        priority=body.priority,
        template_text=body.template_text,
        is_fallback=body.is_fallback,
        is_active=body.is_active,
    )
    db.add(t)
    db.flush()
    log_event(
        db,
        event_type="admin_template_created",
        status="ok",
        metadata={"template_id": str(t.id)},
    )
    db.commit()
    db.refresh(t)
    return _template_out(t)


@router.patch("/templates/{item_id}", response_model=TemplateOut)
def update_template(
    item_id: UUID, body: TemplateUpdate, db: Session = Depends(get_db)
) -> TemplateOut:
    t = db.get(ResponseTemplate, item_id)
    if not t:
        raise HTTPException(404, "Template not found")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(t, key, val)
    log_event(
        db,
        event_type="admin_template_updated",
        status="ok",
        metadata={"template_id": str(t.id)},
    )
    db.commit()
    db.refresh(t)
    return _template_out(t)


# --- Scenarios ---


@router.get("/scenarios", response_model=list[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db)) -> list[ScenarioOut]:
    rows = db.scalars(
        select(InteractionScenario).order_by(InteractionScenario.scenario_code)
    ).all()
    return [_scenario_out(s) for s in rows]


@router.get("/scenarios/{item_id}", response_model=ScenarioOut)
def get_scenario(item_id: UUID, db: Session = Depends(get_db)) -> ScenarioOut:
    s = db.get(InteractionScenario, item_id)
    if not s:
        raise HTTPException(404, "Scenario not found")
    return _scenario_out(s)


@router.post("/scenarios", response_model=ScenarioOut, status_code=201)
def create_scenario(body: ScenarioCreate, db: Session = Depends(get_db)) -> ScenarioOut:
    existing = db.scalars(
        select(InteractionScenario).where(InteractionScenario.scenario_code == body.code)
    ).first()
    if existing:
        raise HTTPException(409, "Scenario code already exists")
    s = InteractionScenario(
        scenario_code=body.code,
        scenario_name=body.title,
        description=body.description,
        is_active=body.is_active,
    )
    db.add(s)
    db.flush()
    log_event(
        db,
        event_type="admin_scenario_updated",
        status="ok",
        metadata={"scenario_id": str(s.id), "action": "created"},
    )
    db.commit()
    db.refresh(s)
    return _scenario_out(s)


@router.patch("/scenarios/{item_id}", response_model=ScenarioOut)
def update_scenario(
    item_id: UUID, body: ScenarioUpdate, db: Session = Depends(get_db)
) -> ScenarioOut:
    s = db.get(InteractionScenario, item_id)
    if not s:
        raise HTTPException(404, "Scenario not found")
    if body.title is not None:
        s.scenario_name = body.title
    if body.description is not None:
        s.description = body.description
    if body.is_active is not None:
        s.is_active = body.is_active
    log_event(
        db,
        event_type="admin_scenario_updated",
        status="ok",
        metadata={"scenario_id": str(s.id), "action": "updated"},
    )
    db.commit()
    db.refresh(s)
    return _scenario_out(s)


# --- Sentiments ---


@router.get("/sentiments", response_model=list[SentimentOut])
def list_sentiments(db: Session = Depends(get_db)) -> list[SentimentOut]:
    rows = db.scalars(
        select(SentimentProfile).order_by(SentimentProfile.sentiment_code)
    ).all()
    return [_sentiment_out(s) for s in rows]


@router.get("/sentiments/{item_id}", response_model=SentimentOut)
def get_sentiment(item_id: UUID, db: Session = Depends(get_db)) -> SentimentOut:
    s = db.get(SentimentProfile, item_id)
    if not s:
        raise HTTPException(404, "Sentiment not found")
    return _sentiment_out(s)


@router.post("/sentiments", response_model=SentimentOut, status_code=201)
def create_sentiment(body: SentimentCreate, db: Session = Depends(get_db)) -> SentimentOut:
    existing = db.scalars(
        select(SentimentProfile).where(SentimentProfile.sentiment_code == body.code)
    ).first()
    if existing:
        raise HTTPException(409, "Sentiment code already exists")
    s = SentimentProfile(
        sentiment_code=body.code,
        sentiment_name=body.title,
        description=body.description,
        is_active=body.is_active,
    )
    db.add(s)
    db.flush()
    log_event(
        db,
        event_type="admin_sentiment_updated",
        status="ok",
        metadata={"sentiment_id": str(s.id), "action": "created"},
    )
    db.commit()
    db.refresh(s)
    return _sentiment_out(s)


@router.patch("/sentiments/{item_id}", response_model=SentimentOut)
def update_sentiment(
    item_id: UUID, body: SentimentUpdate, db: Session = Depends(get_db)
) -> SentimentOut:
    s = db.get(SentimentProfile, item_id)
    if not s:
        raise HTTPException(404, "Sentiment not found")
    if body.title is not None:
        s.sentiment_name = body.title
    if body.description is not None:
        s.description = body.description
    if body.is_active is not None:
        s.is_active = body.is_active
    log_event(
        db,
        event_type="admin_sentiment_updated",
        status="ok",
        metadata={"sentiment_id": str(s.id), "action": "updated"},
    )
    db.commit()
    db.refresh(s)
    return _sentiment_out(s)
