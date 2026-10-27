"""Route-level tests using dependency_overrides for auth and monkeypatched
db helpers instead of a real Postgres connection -- fast, and still catches
the class of bug a pure-unit test on ai.py can't (owner scoping, the rate
limiter, routes that forgot a not-found check).
"""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app import main
from app.auth import CurrentUser, current_user
from app.main import app

client = TestClient(app)


def _user(role="protected", uid="11111111-1111-1111-1111-111111111111"):
    return CurrentUser({"id": uid, "name": "Test", "email": "t@t.test", "phone": None, "role": role, "simpleMode": False, "suburb": None})


@pytest.fixture(autouse=True)
def _reset_overrides():
    yield
    app.dependency_overrides.clear()


def test_get_report_scoped_to_owner_returns_404(monkeypatch):
    """The query is owner-scoped in SQL (where reporter_id = caller), so a
    real mismatch surfaces as an empty result -- confirm that maps to 404,
    not a leak of someone else's report."""
    app.dependency_overrides[current_user] = lambda: _user()
    monkeypatch.setattr(main, "one", lambda *a, **k: None)
    res = client.get("/reports/22222222-2222-2222-2222-222222222222")
    assert res.status_code == 404


def test_moderate_report_requires_admin():
    # require_admin depends on current_user internally, so faking current_user
    # with a non-admin role is enough to exercise the real role check.
    app.dependency_overrides[current_user] = lambda: _user(role="protected")
    res = client.post("/admin/reports/22222222-2222-2222-2222-222222222222/moderate", json={"decision": "approved"})
    assert res.status_code == 403


def test_moderate_report_approve_and_reject_build_valid_params(monkeypatch):
    """Regression test for the ambiguous-parameter-type bug: approve must not
    send a reason, reject must send the trimmed one, and neither should raise."""
    app.dependency_overrides[current_user] = lambda: _user(role="admin")
    calls = []

    def fake_one(sql, params=None):
        calls.append(params)
        return {"id": "r1"}

    monkeypatch.setattr(main, "one", fake_one)

    client.post("/admin/reports/22222222-2222-2222-2222-222222222222/moderate", json={"decision": "approved"})
    assert calls[-1]["reason"] is None

    client.post("/admin/reports/22222222-2222-2222-2222-222222222222/moderate", json={"decision": "rejected", "reason": "  spam  "})
    assert calls[-1]["reason"] == "spam"


def test_alert_guardians_404s_on_missing_check(monkeypatch):
    """Regression test: previously fell through with check=None instead of 404ing."""
    app.dependency_overrides[current_user] = lambda: _user()
    monkeypatch.setattr(main, "one", lambda *a, **k: None)
    res = client.post("/checks/22222222-2222-2222-2222-222222222222/alert")
    assert res.status_code == 404


def test_bad_uuid_path_param_is_a_clean_422_not_a_500():
    app.dependency_overrides[current_user] = lambda: _user()
    res = client.get("/checks/not-a-uuid")
    assert res.status_code == 422


def _fake_cursor_cm(fetchone_result):
    """A MagicMock satisfies the `with ... as cur:` protocol properly (magic
    methods are looked up on the type, so a plain SimpleNamespace wouldn't)."""
    fake_cursor = MagicMock()
    fake_cursor.fetchone.return_value = fetchone_result
    cm = MagicMock()
    cm.__enter__.return_value = fake_cursor
    return cm, fake_cursor


def test_rate_limit_blocks_at_the_cap(monkeypatch):
    cm, fake_cursor = _fake_cursor_cm({"n": main._MAX_AI_CALLS_PER_HOUR})
    monkeypatch.setattr(main, "transaction", lambda: cm)

    with pytest.raises(Exception) as exc_info:
        main._check_rate_limit("u1")
    assert getattr(exc_info.value, "status_code", None) == 429
    # Never recorded a new call once already at the cap.
    insert_calls = [c for c in fake_cursor.execute.call_args_list if "insert into ai_calls" in c.args[0]]
    assert not insert_calls


def test_rate_limit_allows_and_records_under_the_cap(monkeypatch):
    cm, fake_cursor = _fake_cursor_cm({"n": 0})
    monkeypatch.setattr(main, "transaction", lambda: cm)

    main._check_rate_limit("u1")  # should not raise
    insert_calls = [c for c in fake_cursor.execute.call_args_list if "insert into ai_calls" in c.args[0]]
    assert len(insert_calls) == 1


def test_suburb_validation_rejects_unknown_suburb(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _user()
    monkeypatch.setattr(main, "one", lambda *a, **k: None)  # "select 1 from suburbs where ..." finds nothing
    res = client.patch("/me", json={"suburb": "Not A Real Place"})
    assert res.status_code == 400


# ---------- Admin panel ----------

import uuid as _uuid  # noqa: E402

ADMIN_ID = _uuid.UUID("22222222-2222-2222-2222-222222222222")


def _admin(uid=ADMIN_ID):
    # CurrentUser.id is a real uuid.UUID in production (psycopg auto-converts
    # the uuid column) -- use one here too, or self/last-admin `==` checks
    # would never match the way they do for real traffic.
    return CurrentUser({"id": uid, "name": "Admin", "email": "a@t.test", "phone": None, "role": "admin", "simpleMode": False, "suburb": None})


def test_admin_routes_require_admin_role():
    app.dependency_overrides[current_user] = lambda: _user(role="guardian")
    assert client.get("/admin/dashboard").status_code == 403
    assert client.get("/admin/users").status_code == 403
    assert client.get("/admin/reports").status_code == 403


def test_cant_change_own_role(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    res = client.patch(f"/admin/users/{ADMIN_ID}", json={"role": "guardian"})
    assert res.status_code == 400


def _admins_locked(monkeypatch, admin_ids):
    """Fakes db.transaction(): the FOR UPDATE select returns these admin ids."""
    cm, cur = _fake_cursor_cm({**_USER_ROW, "role": "guardian"})
    cur.fetchall.return_value = [{"id": i} for i in admin_ids]
    monkeypatch.setattr(main, "transaction", lambda: cm)
    return cur


def test_cant_demote_the_last_admin(monkeypatch):
    other_admin = _uuid.uuid4()
    app.dependency_overrides[current_user] = lambda: _admin()
    cur = _admins_locked(monkeypatch, [other_admin])
    res = client.patch(f"/admin/users/{other_admin}", json={"role": "guardian"})
    assert res.status_code == 400
    assert "for update" in cur.execute.call_args_list[0].args[0]  # the count is taken under a lock
    assert not any("update profiles" in c.args[0] for c in cur.execute.call_args_list)


def test_can_demote_an_admin_when_another_remains(monkeypatch):
    other_admin = _uuid.uuid4()
    app.dependency_overrides[current_user] = lambda: _admin()
    _admins_locked(monkeypatch, [other_admin, _uuid.uuid4()])  # one other admin remains
    res = client.patch(f"/admin/users/{other_admin}", json={"role": "guardian"})
    assert res.status_code == 200


_USER_ROW = {"id": "x", "name": "N", "email": "e@t.test", "phone": None, "role": "guardian", "simpleMode": False, "suburb": None}


def test_cant_delete_own_account():
    app.dependency_overrides[current_user] = lambda: _admin()
    res = client.delete(f"/admin/users/{ADMIN_ID}")
    assert res.status_code == 400


def test_cant_delete_the_last_admin(monkeypatch):
    other_admin = _uuid.uuid4()
    app.dependency_overrides[current_user] = lambda: _admin()

    def fake_one(sql, params=None):
        if "select role" in sql:
            return {"role": "admin"}
        if "count(*)" in sql:
            return {"n": 0}
        return {"id": other_admin}

    monkeypatch.setattr(main, "one", fake_one)
    res = client.delete(f"/admin/users/{other_admin}")
    assert res.status_code == 400


def test_explainer_duplicate_slug_is_a_clean_400(monkeypatch):
    from psycopg.errors import UniqueViolation

    app.dependency_overrides[current_user] = lambda: _admin()

    def raise_unique(*a, **k):
        raise UniqueViolation("duplicate key")

    monkeypatch.setattr(main, "one", raise_unique)
    res = client.post(
        "/admin/explainers",
        json={
            "slug": "bank-fraud-call",
            "scamType": "bank",
            "title": "t",
            "summary": "s",
            "exampleChannel": "call",
            "exampleText": "e",
            "signs": ["a"],
            "whatToDo": ["b"],
            "sourceName": "SABRIC",
            "sourceUrl": "https://example.com",
        },
    )
    assert res.status_code == 400


def test_explainer_keeps_how_they_take_your_money(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    sent = {}

    def echo(sql, params):
        sent.update(params)
        return {**params, "id": "e1", "scamType": params["scamType"]}

    monkeypatch.setattr(main, "one", echo)
    body = {
        "slug": "hi-mom-new-number",
        "scamType": "family",
        "title": "t",
        "summary": "s",
        "exampleChannel": "whatsapp",
        "exampleText": "e",
        "countingOn": "Your love for your family.",
        "playbook": ["They pick parents.", "The money is moved on within minutes."],
        "signs": ["a"],
        "whatToDo": ["b"],
        "sourceName": "SABRIC",
        "sourceUrl": "https://example.com",
    }
    res = client.post("/admin/explainers", json=body)
    assert res.status_code == 200
    assert sent["countingOn"] == "Your love for your family."
    assert res.json()["playbook"] == ["They pick parents.", "The money is moved on within minutes."]

    del body["countingOn"], body["playbook"]  # older clients: the plan is optional
    assert client.post("/admin/explainers", json=body).json()["playbook"] == []


def test_delete_suburb_still_in_use_is_a_clean_400(monkeypatch):
    from psycopg.errors import ForeignKeyViolation

    app.dependency_overrides[current_user] = lambda: _admin()

    def raise_fk(*a, **k):
        raise ForeignKeyViolation("still referenced")

    monkeypatch.setattr(main, "one", raise_fk)
    res = client.delete("/admin/suburbs/Bellville")
    assert res.status_code == 400


def test_admin_dashboard_shape(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    monkeypatch.setattr(main, "query", lambda *a, **k: [])
    monkeypatch.setattr(main, "one", lambda *a, **k: {"checks": 0, "ai": 0, "joined": 0, "active": 0})
    res = client.get("/admin/dashboard")
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"users", "checks", "reports", "aiCallsLast24h", "trend", "activity"}
    assert body["users"] == {"total": 0, "byRole": {"protected": 0, "guardian": 0, "admin": 0}, "new7Days": 0, "active7Days": 0}


def test_bad_check_input_is_rejected_before_spending_a_rate_limit_slot(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _user()
    monkeypatch.setattr(main, "_check_rate_limit", lambda _: (_ for _ in ()).throw(AssertionError("rate limit hit")))
    assert client.post("/checks", json={"kind": "message", "text": "   "}).status_code == 400
    heic = {"base64": "AAAAGGZ0eXBoZWljcmVzdA==", "mediaType": "image/heic"}
    assert client.post("/checks", json={"kind": "message", "image": heic}).status_code == 400


def test_report_cant_point_at_someone_elses_check(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _user()
    monkeypatch.setattr(main, "one", lambda sql, params=None: {"x": 1} if "from suburbs" in sql else None)
    body = {"channel": "sms", "scamType": "bank", "description": "Fake bank SMS with a link", "suburb": "Bellville", "checkId": str(_uuid.uuid4())}
    assert client.post("/reports", json=body).status_code == 400


def test_inputs_that_used_to_500(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    assert client.get("/admin/users?limit=-1").status_code == 422
    assert client.patch("/me", json={"name": None}).status_code == 422
    assert client.patch("/me", json={"simpleMode": None}).status_code == 422
    big = client.post("/checks", content=b"x", headers={"content-length": str(9 * 1024 * 1024), "content-type": "application/json"})
    assert big.status_code == 413


def test_admin_edits_only_the_fields_sent(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    monkeypatch.setattr(main, "one", lambda *a, **k: {"x": 1})  # the suburb exists
    cm, cur = _fake_cursor_cm(_USER_ROW)
    monkeypatch.setattr(main, "transaction", lambda: cm)
    res = client.patch(f"/admin/users/{_uuid.uuid4()}", json={"name": "Thandi", "phone": "  ", "suburb": "Soweto"})
    assert res.status_code == 200
    sql, params = cur.execute.call_args.args
    assert "name = %(name)s" in sql and "suburb = %(suburb)s" in sql and "role" not in sql.split("returning")[0]
    assert params["phone"] is None  # blank clears it rather than saving spaces


def test_admin_can_rename_self_but_not_change_own_role(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    cm, _ = _fake_cursor_cm(_USER_ROW)
    monkeypatch.setattr(main, "transaction", lambda: cm)
    assert client.patch(f"/admin/users/{ADMIN_ID}", json={"name": "Lerato M"}).status_code == 200
    assert client.patch(f"/admin/users/{ADMIN_ID}", json={"role": "guardian"}).status_code == 400


def test_create_user_returns_a_one_time_password(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    monkeypatch.setattr(main, "one", lambda *a, **k: _USER_ROW)
    sent = {}

    def fake_auth(method, path, **kw):
        sent.update(kw["json"])
        return MagicMock(status_code=200, json=lambda: {"id": str(_uuid.uuid4())})

    monkeypatch.setattr(main, "_auth_admin", fake_auth)
    res = client.post("/admin/users", json={"name": "Gogo Mavis", "email": "Mavis@Example.test", "role": "protected"})
    assert res.status_code == 201
    assert len(res.json()["tempPassword"]) >= 12 and sent["email"] == "mavis@example.test" and sent["email_confirm"]


def test_create_user_with_a_taken_email_is_a_clean_400(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _admin()
    monkeypatch.setattr(main, "_auth_admin", lambda *a, **k: MagicMock(status_code=422))
    res = client.post("/admin/users", json={"name": "Marie", "email": "marie@onhold.test", "role": "protected"})
    assert res.status_code == 400
    assert client.post("/admin/users", json={"name": "X", "email": "not-an-email", "role": "protected"}).status_code == 422


def test_activity_is_admin_only_and_filters_by_user(monkeypatch):
    app.dependency_overrides[current_user] = lambda: _user(role="guardian")
    assert client.get("/admin/activity").status_code == 403
    app.dependency_overrides[current_user] = lambda: _admin()
    seen = {}
    monkeypatch.setattr(main, "query", lambda sql, params=None: seen.update(params) or [])
    uid = _uuid.uuid4()
    assert client.get(f"/admin/activity?userId={uid}&type=check").status_code == 200
    assert seen["userId"] == uid and seen["type"] == "check"
    assert client.get("/admin/activity?type=nonsense").status_code == 422


def test_demo_accounts_cant_delete_themselves(monkeypatch):
    marie = _user()
    marie.row["email"] = "marie@onhold.test"
    app.dependency_overrides[current_user] = lambda: marie
    monkeypatch.setattr(main, "_delete_auth_user", lambda _: (_ for _ in ()).throw(AssertionError("deleted")))
    assert client.delete("/me").status_code == 400
