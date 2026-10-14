from types import SimpleNamespace

import pytest

from app import ai


def _stub_response(parsed, stop_reason="end_turn"):
    return SimpleNamespace(parsed_output=parsed, stop_reason=stop_reason)


def test_test_error_skips_the_api_call(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("should not call Claude")

    monkeypatch.setattr(ai, "_client", boom)
    monkeypatch.setattr(ai.get_settings(), "demo_hooks", True)
    with pytest.raises(ai.CheckFailed):
        ai.run_check("message", "please say test-error here", None)


def test_empty_input_fails_without_calling_the_api(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("should not call Claude")

    monkeypatch.setattr(ai, "_client", boom)
    with pytest.raises(ai.CheckFailed):
        ai.run_check("message", "", None)


def test_api_error_becomes_check_failed(monkeypatch):
    import anthropic

    class FakeMessages:
        def parse(self, **kwargs):
            raise anthropic.APIConnectionError(request=SimpleNamespace())

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    with pytest.raises(ai.CheckFailed):
        ai.run_check("message", "a suspicious message", None)


def test_missing_parsed_output_becomes_check_failed(monkeypatch):
    class FakeMessages:
        def parse(self, **kwargs):
            return _stub_response(None)

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    with pytest.raises(ai.CheckFailed):
        ai.run_check("message", "a suspicious message", None)


def test_call_verdict_falls_back_to_generic_say_this(monkeypatch):
    verdict = ai.ScamVerdict(
        verdict="stop",
        confidence=0.9,
        scam_type="bank",
        headline="Fake bank call",
        reasons=["Asked for your OTP"],
        next_steps=["Hang up"],
        say_this=None,  # model didn't give one
        is_call=True,
    )

    class FakeMessages:
        def parse(self, **kwargs):
            return _stub_response(verdict)

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    result = ai.run_check("message", "a man phoned from the bank", None)

    assert result["kind"] == "call"  # upgraded from "message" because is_call=True
    assert result["sayThis"] == ai.GENERIC_SAY


def test_ask_about_check_answers_from_verdict_context(monkeypatch):
    check = {
        "verdict": "stop",
        "headline": "Fake bank call",
        "reasons": ["Asked for your OTP"],
        "nextSteps": ["Hang up"],
        "kind": "call",
        "scamType": "bank",
        "sayThis": "I don't do this over the phone.",
    }
    captured = {}

    class FakeMessages:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(content=[SimpleNamespace(type="text", text="  You're safe to hang up. ")], stop_reason="end_turn")

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    answer = ai.ask_about_check(check, [{"role": "user", "content": "earlier question"}, {"role": "assistant", "content": "earlier answer"}], "should I block the number?")

    assert answer == "You're safe to hang up."
    assert "Fake bank call" in captured["system"]
    assert captured["messages"][-1] == {"role": "user", "content": "should I block the number?"}


def test_ask_about_check_no_text_raises(monkeypatch):
    class FakeMessages:
        def create(self, **kwargs):
            return SimpleNamespace(content=[], stop_reason="end_turn")

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    with pytest.raises(ai.CheckFailed):
        ai.ask_about_check({"verdict": "safe", "headline": "h", "reasons": ["r"], "nextSteps": ["n"], "kind": "message", "scamType": None}, [], "huh?")


def test_safe_verdict_never_gets_say_this(monkeypatch):
    verdict = ai.ScamVerdict(
        verdict="safe",
        confidence=0.8,
        scam_type=None,
        headline="Looks like a normal message",
        reasons=["Nothing suspicious"],
        next_steps=["No action needed"],
        say_this="this should be dropped",
        is_call=True,
    )

    class FakeMessages:
        def parse(self, **kwargs):
            return _stub_response(verdict)

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    result = ai.run_check("call", "hi it's your sister", None)

    assert result["sayThis"] is None


def test_image_type_is_read_from_the_bytes_not_the_client():
    """iOS reports a PNG screenshot as image/png but sends JPEG base64 -- trusting the label 503'd every check."""
    import base64

    jpeg = base64.b64encode(bytes.fromhex("ffd8ffe000104a464946") + b"rest").decode()
    png = base64.b64encode(bytes.fromhex("89504e470d0a1a0a") + b"rest").decode()
    assert ai._image_block(jpeg)["source"]["media_type"] == "image/jpeg"
    assert ai._image_block(f"data:image/png;base64,{png}")["source"] == {"type": "base64", "media_type": "image/png", "data": png}

    heic = base64.b64encode(b"\0\0\0\x18ftypheic" + b"rest").decode()
    with pytest.raises(ai.BadImage):
        ai._image_block(heic)
    with pytest.raises(ai.BadImage):
        ai._image_block("A" * (ai.MAX_IMAGE_BYTES * 2))


def _verdict(**overrides):
    fields = dict(verdict="stop", confidence=0.9, scam_type="bank", headline="Fake bank call", reasons=["r"], next_steps=["n"], say_this=None, is_call=False)
    return ai.ScamVerdict(**{**fields, **overrides})


def test_over_long_output_is_clipped_not_failed(monkeypatch):
    """Structured output can't enforce max lengths, so a 4th reason must not 500 the whole check."""
    long = _verdict(confidence=1.3, headline="h" * 200, reasons=list("abcd"), next_steps=list("wxyz"))

    class FakeMessages:
        def parse(self, **kwargs):
            return _stub_response(long)

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    result = ai.run_check("message", "some text", None)
    assert (result["confidence"], len(result["headline"]), result["reasons"], result["nextSteps"]) == (1.0, 120, list("abc"), list("wxy"))


@pytest.mark.parametrize("stop_reason", ["refusal", "max_tokens"])
def test_refused_or_truncated_check_fails_cleanly(monkeypatch, stop_reason):
    class FakeMessages:
        def parse(self, **kwargs):
            return _stub_response(_verdict(), stop_reason=stop_reason)

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    with pytest.raises(ai.CheckFailed):
        ai.run_check("message", "some text", None)


def test_test_error_is_ignored_without_demo_hooks(monkeypatch):
    class FakeMessages:
        def parse(self, **kwargs):
            return _stub_response(_verdict())

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    assert ai.run_check("message", "SMS with test-error in it", None)["verdict"] == "stop"


def test_cut_off_chat_reply_keeps_whole_sentences(monkeypatch):
    class FakeMessages:
        def create(self, **kwargs):
            return SimpleNamespace(content=[SimpleNamespace(type="text", text="Hang up. Then phone your bank on the number on your card and")], stop_reason="max_tokens")

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    check = {"verdict": "stop", "headline": "h", "reasons": ["r"], "nextSteps": ["n"], "kind": "call", "scamType": "bank"}
    assert ai.ask_about_check(check, [], "what now?") == "Hang up."
