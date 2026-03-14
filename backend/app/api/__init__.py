from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.items import router as items_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.routes.settings import router as settings_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(items_router)
api_router.include_router(onboarding_router)
api_router.include_router(settings_router)
