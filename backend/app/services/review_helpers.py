from app.models.entities import Review, ReviewClassification, ReviewResponse


def latest_classification(review: Review) -> ReviewClassification | None:
    if not review.classifications:
        return None
    return sorted(review.classifications, key=lambda c: c.created_at)[-1]


def latest_response(review: Review) -> ReviewResponse | None:
    if not review.responses:
        return None
    return sorted(review.responses, key=lambda r: r.created_at)[-1]


def review_text_preview(text: str, max_len: int = 120) -> str:
    normalized = text.strip()
    if len(normalized) <= max_len:
        return normalized
    return normalized[: max_len - 3] + "..."
