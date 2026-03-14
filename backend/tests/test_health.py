from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok(monkeypatch):
    class DummyResult:
        def execute(self, _query):
            return None

    def override_get_db():
        yield DummyResult()

    from app.api.routes.health import get_db

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)
    response = client.get('/health')

    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}

    app.dependency_overrides.clear()
