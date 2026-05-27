import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import PromptVersion
from app.services.operational_log import log_event

PLACEHOLDER_PATTERN = re.compile(r"\{\{(\w+)\}\}")


class PromptService:
    PROMPT_KEY_CLASSIFICATION = "review_classification"
    PROMPT_KEY_GENERATION = "review_response_generation"

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_active(self, prompt_key: str) -> PromptVersion:
        prompt = self.db.scalar(
            select(PromptVersion).where(
                PromptVersion.prompt_key == prompt_key,
                PromptVersion.is_active.is_(True),
            )
        )
        if not prompt:
            raise HTTPException(
                status_code=500,
                detail=f"No active prompt for key: {prompt_key}",
            )
        return prompt

    @staticmethod
    def render_template(template: str, context: dict[str, str]) -> str:
        def replacer(match: re.Match[str]) -> str:
            key = match.group(1)
            return context.get(key, "")

        return PLACEHOLDER_PATTERN.sub(replacer, template)

    def next_version(self, prompt_key: str) -> int:
        current = self.db.scalar(
            select(func.max(PromptVersion.version)).where(
                PromptVersion.prompt_key == prompt_key
            )
        )
        return (current or 0) + 1

    def create_version(
        self,
        *,
        prompt_key: str,
        title: str,
        system_prompt: str,
        user_prompt_template: str,
    ) -> PromptVersion:
        version_num = self.next_version(prompt_key)
        now = datetime.now(timezone.utc)
        prompt = PromptVersion(
            prompt_key=prompt_key,
            version=version_num,
            title=title,
            system_prompt=system_prompt,
            user_prompt_template=user_prompt_template,
            is_active=False,
            version_number=f"{prompt_key}-v{version_num}",
            prompt_text=system_prompt,
            comment=title,
            created_by="admin-ui",
            created_at=now,
            updated_at=now,
        )
        self.db.add(prompt)
        self.db.flush()

        log_event(
            self.db,
            event_type="prompt_version_created",
            entity_type="prompt_version",
            entity_id=prompt.id,
            prompt_version_id=prompt.id,
            status="ok",
        )
        return prompt

    def activate(self, prompt_id: uuid.UUID) -> PromptVersion:
        prompt = self.db.get(PromptVersion, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt version not found")

        self.db.query(PromptVersion).filter(
            PromptVersion.prompt_key == prompt.prompt_key,
            PromptVersion.is_active.is_(True),
        ).update({"is_active": False, "updated_at": datetime.now(timezone.utc)})

        prompt.is_active = True
        prompt.updated_at = datetime.now(timezone.utc)

        log_event(
            self.db,
            event_type="prompt_version_activated",
            entity_type="prompt_version",
            entity_id=prompt.id,
            prompt_version_id=prompt.id,
            status="ok",
        )
        self.db.commit()
        self.db.refresh(prompt)
        return prompt
