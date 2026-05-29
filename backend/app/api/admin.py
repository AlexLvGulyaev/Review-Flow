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
from app.services.classification_refs import ClassificationRefsService
from app.services.operational_log import log_event

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


def _phrase_out(refs: ClassificationRefsService, p: ReviewPhrasePattern) -> PhraseOut:
    return PhraseOut(
        id=p.id,
        phrase_text=p.phrase_text,
        scenario=refs.ref_for_scenario_id(p.scenario_id),
        sentiment=refs.ref_for_sentiment_id(p.sentiment_id),
        priority=refs.ref_for_priority_id(p.priority_id),
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def _template_out(refs: ClassificationRefsService, t: ResponseTemplate) -> TemplateOut:
    return TemplateOut(
        id=t.id,
        title=t.title,
        scenario=refs.ref_for_scenario_id(t.scenario_id),
        sentiment=refs.ref_for_sentiment_id(t.sentiment_id),
        priority=refs.ref_for_priority_id(t.priority_id),
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


def _resolve_phrase_refs(refs: ClassificationRefsService, body) -> tuple:
    scenario = refs.get_scenario_by_id(body.scenario_id) if body.scenario_id else None
    sentiment = refs.get_sentiment_by_id(body.sentiment_id) if body.sentiment_id else None
    priority = refs.get_priority_by_id(body.priority_id) if body.priority_id else None
    return scenario, sentiment, priority


def _resolve_template_refs(refs: ClassificationRefsService, body) -> tuple:
    return _resolve_phrase_refs(refs, body)


# --- Phrases ---


@router.get("/phrases", response_model=list[PhraseOut])
def list_phrases(db: Session = Depends(get_db)) -> list[PhraseOut]:
    refs = ClassificationRefsService(db)
    rows = db.scalars(
        select(ReviewPhrasePattern).order_by(ReviewPhrasePattern.created_at.desc())
    ).all()
    return [_phrase_out(refs, p) for p in rows]


@router.get("/phrases/{item_id}", response_model=PhraseOut)
def get_phrase(item_id: UUID, db: Session = Depends(get_db)) -> PhraseOut:
    refs = ClassificationRefsService(db)
    p = db.get(ReviewPhrasePattern, item_id)
    if not p:
        raise HTTPException(404, "Phrase not found")
    return _phrase_out(refs, p)


@router.post("/phrases", response_model=PhraseOut, status_code=201)
def create_phrase(body: PhraseCreate, db: Session = Depends(get_db)) -> PhraseOut:
    refs = ClassificationRefsService(db)
    scenario, sentiment, priority = _resolve_phrase_refs(refs, body)
    now = datetime.now(timezone.utc)
    p = ReviewPhrasePattern(
        phrase_text=body.phrase_text,
        scenario_id=scenario.id if scenario else None,
        sentiment_id=sentiment.id if sentiment else None,
        priority_id=priority.id if priority else None,
        is_active=body.is_active,
        created_at=now,
        updated_at=now,
    )
    refs.sync_phrase_legacy(p, scenario, sentiment, priority)
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
    return _phrase_out(refs, p)


@router.patch("/phrases/{item_id}", response_model=PhraseOut)
def update_phrase(
    item_id: UUID, body: PhraseUpdate, db: Session = Depends(get_db)
) -> PhraseOut:
    refs = ClassificationRefsService(db)
    p = db.get(ReviewPhrasePattern, item_id)
    if not p:
        raise HTTPException(404, "Phrase not found")
    data = body.model_dump(exclude_unset=True)
    scenario = p.interaction_scenario
    sentiment = p.sentiment_profile
    priority = p.priority_level
    if "phrase_text" in data:
        p.phrase_text = data.pop("phrase_text")
    if "is_active" in data:
        p.is_active = data.pop("is_active")
    if "scenario_id" in data:
        sid = data.pop("scenario_id")
        scenario = refs.get_scenario_by_id(sid) if sid else None
        p.scenario_id = scenario.id if scenario else None
    if "sentiment_id" in data:
        sid = data.pop("sentiment_id")
        sentiment = refs.get_sentiment_by_id(sid) if sid else None
        p.sentiment_id = sentiment.id if sentiment else None
    if "priority_id" in data:
        pid = data.pop("priority_id")
        priority = refs.get_priority_by_id(pid) if pid else None
        p.priority_id = priority.id if priority else None
    refs.sync_phrase_legacy(p, scenario, sentiment, priority)
    p.updated_at = datetime.now(timezone.utc)
    log_event(
        db,
        event_type="admin_phrase_updated",
        status="ok",
        metadata={"phrase_id": str(p.id)},
    )
    db.commit()
    db.refresh(p)
    return _phrase_out(refs, p)


# --- Templates ---


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)) -> list[TemplateOut]:
    refs = ClassificationRefsService(db)
    rows = db.scalars(select(ResponseTemplate).order_by(ResponseTemplate.title)).all()
    return [_template_out(refs, t) for t in rows]


@router.get("/templates/{item_id}", response_model=TemplateOut)
def get_template(item_id: UUID, db: Session = Depends(get_db)) -> TemplateOut:
    refs = ClassificationRefsService(db)
    t = db.get(ResponseTemplate, item_id)
    if not t:
        raise HTTPException(404, "Template not found")
    return _template_out(refs, t)


@router.post("/templates", response_model=TemplateOut, status_code=201)
def create_template(body: TemplateCreate, db: Session = Depends(get_db)) -> TemplateOut:
    refs = ClassificationRefsService(db)
    scenario, sentiment, priority = _resolve_template_refs(refs, body)
    t = ResponseTemplate(
        title=body.title,
        scenario_id=scenario.id if scenario else None,
        sentiment_id=sentiment.id if sentiment else None,
        priority_id=priority.id if priority else None,
        template_text=body.template_text,
        is_fallback=body.is_fallback,
        is_active=body.is_active,
    )
    refs.sync_template_legacy(t, scenario, sentiment, priority)
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
    return _template_out(refs, t)


@router.patch("/templates/{item_id}", response_model=TemplateOut)
def update_template(
    item_id: UUID, body: TemplateUpdate, db: Session = Depends(get_db)
) -> TemplateOut:
    refs = ClassificationRefsService(db)
    t = db.get(ResponseTemplate, item_id)
    if not t:
        raise HTTPException(404, "Template not found")
    data = body.model_dump(exclude_unset=True)
    scenario = t.interaction_scenario
    sentiment = t.sentiment_profile
    priority = t.priority_level
    for key in ("title", "template_text", "is_fallback", "is_active"):
        if key in data:
            setattr(t, key, data.pop(key))
    if "scenario_id" in data:
        sid = data.pop("scenario_id")
        scenario = refs.get_scenario_by_id(sid) if sid else None
        t.scenario_id = scenario.id if scenario else None
    if "sentiment_id" in data:
        sid = data.pop("sentiment_id")
        sentiment = refs.get_sentiment_by_id(sid) if sid else None
        t.sentiment_id = sentiment.id if sentiment else None
    if "priority_id" in data:
        pid = data.pop("priority_id")
        priority = refs.get_priority_by_id(pid) if pid else None
        t.priority_id = priority.id if priority else None
    refs.sync_template_legacy(t, scenario, sentiment, priority)
    log_event(
        db,
        event_type="admin_template_updated",
        status="ok",
        metadata={"template_id": str(t.id)},
    )
    db.commit()
    db.refresh(t)
    return _template_out(refs, t)


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
