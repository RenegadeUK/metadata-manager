from pydantic import BaseModel, Field
from fastapi import APIRouter

from app.core.env_store import load_managed_settings, save_managed_settings

router = APIRouter(prefix='/api/settings', tags=['settings'])


class AppSettingsPayload(BaseModel):
    app_name: str = Field(alias='APP_NAME')
    app_env: str = Field(alias='APP_ENV')
    app_log_level: str = Field(alias='APP_LOG_LEVEL')
    cors_origins: str = Field(alias='CORS_ORIGINS')
    postgres_db: str = Field(alias='POSTGRES_DB')
    postgres_user: str = Field(alias='POSTGRES_USER')
    postgres_password: str = Field(alias='POSTGRES_PASSWORD')

    model_config = {'populate_by_name': True}


class AppSettingsResponse(BaseModel):
    values: dict[str, str]
    restart_required: bool = True


@router.get('', response_model=AppSettingsResponse)
def get_settings() -> AppSettingsResponse:
    return AppSettingsResponse(values=load_managed_settings())


@router.put('', response_model=AppSettingsResponse)
def update_settings(payload: AppSettingsPayload) -> AppSettingsResponse:
    values = save_managed_settings(payload.model_dump(by_alias=True))
    return AppSettingsResponse(values=values)
