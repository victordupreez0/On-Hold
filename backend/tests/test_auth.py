import time
from types import SimpleNamespace

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import auth
from app.main import app

client = TestClient(app)


def test_me_requires_auth():
    res = client.get("/me")
    assert res.status_code == 401


def test_admin_route_requires_auth():
    res = client.get("/admin/dashboard")
    assert res.status_code == 401


def test_health_is_public():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_fresh_token_accepted_despite_clock_skew(monkeypatch):
    """A token issued "a few seconds in the future" by Supabase's clock must still sign in."""
    key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(auth, "_jwks", lambda: SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=key.public_key())))
    monkeypatch.setattr(auth, "one", lambda *_: {"id": "u1", "name": "Marie", "email": "m@x", "phone": None, "role": "protected", "simpleMode": False, "suburb": None})
    now = int(time.time())
    token = jwt.encode({"sub": "u1", "aud": "authenticated", "iat": now + 5, "exp": now + 3600}, key, algorithm="ES256")
    res = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["name"] == "Marie"
