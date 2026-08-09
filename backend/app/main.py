from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.response_cases_admin import router as response_cases_admin_router
from app.api.ch_analytics import router as ch_analytics_router
from app.api.reports import router as reports_router
from app.api.reference import router as reference_router
from app.api.analytics import router as analytics_router
from app.api.evaluation import router as evaluation_router
from app.api.health import router as health_router
from app.api.logs import router as logs_router
from app.api.operator import router as operator_router
from app.api.prompts import router as prompts_router
from app.api.settings_ai_providers import router as ai_providers_router
from app.api.settings_ch_runtime import router as ch_runtime_settings_router
from app.api.reviews import router as reviews_router
from app.core.errors import register_exception_handlers
from app.db.migrate import run_pending_migrations


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_pending_migrations()
    yield


app = FastAPI(title="Review Flow API", version="0.7.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(health_router)
app.include_router(reviews_router)
app.include_router(operator_router)
app.include_router(prompts_router)
app.include_router(evaluation_router)
app.include_router(analytics_router)
app.include_router(logs_router)
app.include_router(admin_router)
app.include_router(response_cases_admin_router)
app.include_router(ch_analytics_router)
app.include_router(reports_router)
app.include_router(reference_router)
app.include_router(ai_providers_router)
app.include_router(ch_runtime_settings_router)
