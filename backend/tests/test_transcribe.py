"""POST /transcribe with the Cloudflare Workers AI call mocked at httpx.post."""

import base64

import httpx
import pytest
from fastapi.testclient import TestClient

from app import ai, main
from app.auth import CurrentUser, current_user
from app.main import app

client = TestClient(app)
AUDIO = base64.b64encode(b"RIFF....WAVEfmt fake audio").decode()


@pytest.fixture(autouse=True)
def ai_calls(monkeypatch):
    app.dependency_overrides[current_user] = lambda: CurrentUser(
        {"id": "u1", "name": "Test", "email": "t@t.test", "phone": None, "role": "protected", "simpleMode": False, "suburb": None}
    )
    monkeypatch.setattr(ai.get_settings(), "cloudflare_account_id", "acct")
    monkeypatch.setattr(ai.get_settings(), "cloudflare_api_token", "tok")
    calls = []
    monkeypatch.setattr(main, "_check_rate_limit", calls.append)
    yield calls
    app.dependency_overrides.clear()


def _cloudflare(monkeypatch, status=200, body=None, raises=None):
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        if raises:
            raise raises
        return httpx.Response(status, json=body, request=httpx.Request("POST", url))

    monkeypatch.setattr(ai.httpx, "post", fake_post)
    return calls


def test_transcribes_through_whisper_and_spends_one_ai_call(monkeypatch, ai_calls):
    calls = _cloudflare(monkeypatch, body={"result": {"text": " Hi Mom, this is my new number. "}, "success": True})
    res = client.post("/transcribe", json={"base64": AUDIO, "mimeType": "audio/webm"})
    assert res.status_code == 200
    assert res.json() == {"text": "Hi Mom, this is my new number."}
    url, kwargs = calls[0]
    assert url == "https://api.cloudflare.com/client/v4/accounts/acct/ai/run/@cf/openai/whisper-large-v3-turbo"
    assert kwargs["headers"]["Authorization"] == "Bearer tok"
    assert kwargs["json"] == {"audio": AUDIO}
    assert ai_calls == ["u1"]


def test_no_words_heard_is_a_400(monkeypatch):
    _cloudflare(monkeypatch, body={"result": {"text": "   "}, "success": True})
    res = client.post("/transcribe", json={"base64": AUDIO})
    assert res.status_code == 400
    assert "catch any words" in res.json()["detail"]


@pytest.mark.parametrize(
    "fake",
    [
        {"status": 500, "body": {"success": False, "errors": [{"message": "boom"}]}},
        {"status": 200, "body": {"success": False, "result": None}},
        {"raises": httpx.ReadTimeout("slow")},
    ],
)
def test_provider_failure_or_timeout_is_a_clean_503(monkeypatch, fake):
    _cloudflare(monkeypatch, **fake)
    res = client.post("/transcribe", json={"base64": AUDIO})
    assert res.status_code == 503
    assert res.json()["detail"].startswith("Couldn’t hear that right now")


def test_missing_config_is_a_503_without_calling_out(monkeypatch):
    calls = _cloudflare(monkeypatch, body={"result": {"text": "x"}})
    monkeypatch.setattr(ai.get_settings(), "cloudflare_api_token", "")
    assert client.post("/transcribe", json={"base64": AUDIO}).status_code == 503
    assert calls == []


@pytest.mark.parametrize(
    "audio",
    [
        base64.b64encode(b"\0" * (ai.MAX_AUDIO_BYTES + 1)).decode(),  # too big
        "not base64!",
        "",  # nothing recorded
    ],
    ids=["too-big", "not-base64", "empty"],
)
def test_bad_audio_is_a_400_before_spending_an_ai_call(monkeypatch, ai_calls, audio):
    calls = _cloudflare(monkeypatch, body={"result": {"text": "x"}})
    assert client.post("/transcribe", json={"base64": audio}).status_code == 400
    assert calls == [] and ai_calls == []


def test_audio_cap_matches_the_app_and_fits_vercels_body_limit():
    """mobile VoiceButton's MAX_BASE64_LENGTH is 4 * 1024 * 1024; a recording exactly that size must pass."""
    at_cap = base64.b64encode(b"\1" * ai.MAX_AUDIO_BYTES).decode()
    assert len(at_cap) == 4 * 1024 * 1024
    ai.check_audio(at_cap)  # doesn't raise
    assert len(f'{{"base64": "{at_cap}", "mimeType": "audio/webm;codecs=opus"}}') < 4.5 * 1024 * 1024
