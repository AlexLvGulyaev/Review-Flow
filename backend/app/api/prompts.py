from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.roles import require_admin
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import PromptVersion
from app.schemas.prompt import PromptCreateRequest, PromptDetail, PromptListItem
from app.services.prompt_service import PromptService

router = APIRouter(
    prefix="/api/prompts",
    tags=["prompts"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[PromptListItem])
def list_prompts(db: Session = Depends(get_db)) -> list[PromptListItem]:
    prompts = db.scalars(
        select(PromptVersion).order_by(
            PromptVersion.prompt_key,
            PromptVersion.version.desc(),
        )
    ).all()
    return [
        PromptListItem(
            id=p.id,
            prompt_key=p.prompt_key,
            version=p.version,
            title=p.title,
            is_active=p.is_active,
            created_at=p.created_at,
        )
        for p in prompts
    ]


@router.get("/{prompt_id}", response_model=PromptDetail)
def get_prompt(prompt_id: UUID, db: Session = Depends(get_db)) -> PromptDetail:
    prompt = db.get(PromptVersion, prompt_id)
    if not prompt:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Prompt not found")
    return PromptDetail(
        id=prompt.id,
        prompt_key=prompt.prompt_key,
        version=prompt.version,
        title=prompt.title,
        system_prompt=prompt.system_prompt,
        user_prompt_template=prompt.user_prompt_template,
        is_active=prompt.is_active,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
    )


@router.post("", response_model=PromptDetail, status_code=201)
def create_prompt(
    payload: PromptCreateRequest,
    db: Session = Depends(get_db),
) -> PromptDetail:
    service = PromptService(db)
    prompt = service.create_version(
        prompt_key=payload.prompt_key,
        title=payload.title,
        system_prompt=payload.system_prompt,
        user_prompt_template=payload.user_prompt_template,
    )
    db.commit()
    db.refresh(prompt)
    return PromptDetail(
        id=prompt.id,
        prompt_key=prompt.prompt_key,
        version=prompt.version,
        title=prompt.title,
        system_prompt=prompt.system_prompt,
        user_prompt_template=prompt.user_prompt_template,
        is_active=prompt.is_active,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
    )


@router.post("/{prompt_id}/activate", response_model=PromptDetail)
def activate_prompt(prompt_id: UUID, db: Session = Depends(get_db)) -> PromptDetail:
    service = PromptService(db)
    prompt = service.activate(prompt_id)
    return PromptDetail(
        id=prompt.id,
        prompt_key=prompt.prompt_key,
        version=prompt.version,
        title=prompt.title,
        system_prompt=prompt.system_prompt,
        user_prompt_template=prompt.user_prompt_template,
        is_active=prompt.is_active,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
    )
