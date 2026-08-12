from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.roles import require_ops_read
from app.db.session import get_db
from app.schemas.reference import ClassificationReferenceBundle
from app.services.classification_refs import ClassificationRefsService

router = APIRouter(
    prefix="/api/reference",
    tags=["reference"],
    dependencies=[Depends(require_ops_read)],
)


@router.get("/classification", response_model=ClassificationReferenceBundle)
def get_classification_reference(db: Session = Depends(get_db)) -> ClassificationReferenceBundle:
    refs = ClassificationRefsService(db)
    bundle = refs.classification_reference_bundle()
    return ClassificationReferenceBundle(**bundle)
