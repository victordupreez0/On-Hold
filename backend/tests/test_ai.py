from types import SimpleNamespace

import pytest

from app import ai


def _stub_response(parsed):
    return SimpleNamespace(parsed_output=parsed)


def test_test_error_skips_the_api_call(monkeypatch):
    def boom(*a, **k):
        raise AssertionError("should not call Claude")

    monkeypatch.setattr(ai, "_client", boom)
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
            return SimpleNamespace(content=[SimpleNamespace(type="text", text="  You're safe to hang up. ")])

    monkeypatch.setattr(ai, "_client", lambda: SimpleNamespace(messages=FakeMessages()))
    answer = ai.ask_about_check(check, [{"role": "user", "content": "earlier question"}, {"role": "assistant", "content": "earlier answer"}], "should I block the number?")

    assert answer == "You're safe to hang up."
    assert "Fake bank call" in captured["system"]
    assert captured["messages"][-1] == {"role": "user", "content": "should I block the number?"}


def test_ask_about_check_no_text_raises(monkeypatch):
    class FakeMessages:
        def create(self, **kwargs):
            return SimpleNamespace(content=[])

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
