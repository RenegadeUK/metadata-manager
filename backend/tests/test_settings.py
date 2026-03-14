from pathlib import Path

from fastapi.testclient import TestClient

from app.core.env_store import load_managed_settings
from app.main import app


def test_settings_round_trip(tmp_path: Path, monkeypatch):
    env_path = tmp_path / '.env'
    monkeypatch.setattr('app.core.env_store.CONFIG_ENV_PATH', env_path)

    client = TestClient(app)

    get_response = client.get('/api/settings')
    assert get_response.status_code == 200
    assert get_response.json()['restart_required'] is True

    payload = {
        'APP_NAME': 'Test Manager',
        'APP_ENV': 'production',
        'APP_LOG_LEVEL': 'DEBUG',
        'CORS_ORIGINS': 'http://localhost:3000,http://localhost:8000',
        'POSTGRES_DB': 'test_db',
        'POSTGRES_USER': 'test_user',
        'POSTGRES_PASSWORD': 'test_pass',
    }
    put_response = client.put('/api/settings', json=payload)

    assert put_response.status_code == 200
    assert put_response.json()['values']['APP_NAME'] == 'Test Manager'
    env_contents = env_path.read_text(encoding='utf-8')
    assert "APP_NAME='Test Manager'" in env_contents
    assert 'DATABASE_URL=postgresql+psycopg://test_user:test_pass@127.0.0.1:5432/test_db' in env_contents
    assert load_managed_settings()['APP_NAME'] == 'Test Manager'
