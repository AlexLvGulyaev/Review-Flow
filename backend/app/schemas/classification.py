from pydantic import BaseModel, Field


class ClassificationResult(BaseModel):
    scenario: str = Field(..., pattern=r"^(complaint|gratitude|suggestion|question)$")
    sentiment: str = Field(..., pattern=r"^(positive|neutral|negative|aggressive)$")
    priority: str = Field(..., pattern=r"^(low|medium|high|critical)$")
    topic: str = Field(..., min_length=1, max_length=128)
    product_area: str = Field(..., min_length=1, max_length=128)
    confidence: float = Field(..., ge=0.0, le=1.0)
