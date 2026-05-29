from uuid import UUID

from pydantic import BaseModel


class ClassificationRefOut(BaseModel):
    id: UUID
    code: str
    name: str


class ClassificationReferenceBundle(BaseModel):
    scenarios: list[ClassificationRefOut]
    sentiments: list[ClassificationRefOut]
    priorities: list[ClassificationRefOut]
