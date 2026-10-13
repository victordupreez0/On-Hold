from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_me_requires_auth():
    res = client.get("/me")
    assert res.status_code == 401


def test_admin_route_requires_auth():
    res = client.get("/admin/reports/pending")
    assert res.status_code == 401


def test_health_is_public():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
