from app.models.entities import ReviewClassification
from app.schemas.review import ClassificationOut
from app.services.classification_refs import ClassificationRefsService


def build_classification_out(
    db,
    cls: ReviewClassification,
    *,
    matched_phrase_text: str | None = None,
) -> ClassificationOut:
    refs = ClassificationRefsService(db)
    scenario_ref, sentiment_ref, priority_ref = refs.classification_out_refs(cls)
    return ClassificationOut(
        scenario=scenario_ref,
        sentiment=sentiment_ref,
        priority=priority_ref,
        topic=cls.topic,
        product_area=cls.product_area,
        confidence=float(cls.confidence) if cls.confidence else None,
        classification_source=cls.classification_source,
        phrase_match_score=float(cls.phrase_match_score) if cls.phrase_match_score else None,
        matched_phrase_text=matched_phrase_text,
    )


def classification_code(ref_or_legacy: object | None, legacy: str | None = None) -> str | None:
    if ref_or_legacy is not None and hasattr(ref_or_legacy, "code"):
        return ref_or_legacy.code
    return legacy
