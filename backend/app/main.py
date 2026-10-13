"""On Hold API. Routes mirror mobile/src/api.ts 1:1 -- same functions, same
error messages, same business rules -- so the frontend's api.ts wrapper can
become a thin fetch layer without touching any screen.
"""

import random
import re
import string
import uuid
from contextlib import asynccontextmanager
from typing import Annotated, Literal

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from psycopg.errors import ForeignKeyViolation, UniqueViolation
from pydantic import BaseModel, Field

from . import ai, auth
from .auth import CurrentUser, current_user, require_admin
from .config import get_settings
from .db import cursor, execute, get_pool, one, query


@asynccontextmanager
async def lifespan(_: FastAPI):
    auth.warm_up()  # fetch JWKS once now, not on the first real request
    get_pool()  # open the DB pool now too, same reason
    yield


app = FastAPI(title="On Hold API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

Channel = Literal["sms", "whatsapp", "email", "call"]
ScamType = Literal["bank", "sassa", "sars", "aarto", "family", "courier", "jobs", "debicheck", "investment", "other"]
Role = Literal["protected", "guardian", "admin"]
ReportStatus = Literal["pending", "approved", "rejected"]

User = Annotated[CurrentUser, Depends(current_user)]
Admin = Annotated[CurrentUser, Depends(require_admin)]


def _found(row: dict | None, message: str) -> dict:
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, message)
    return row


def _require_suburb(name: str | None):
    if name and not one("select 1 from suburbs where name = %(n)s", {"n": name}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a suburb from the list.")


_MAX_AI_CALLS_PER_HOUR = 30


def _check_rate_limit(user_id: str):
    """Atomic per-user hourly cap on Claude calls (checks + follow-up chat
    share one budget). A per-user advisory lock serializes concurrent
    requests from the same user around the count-then-record step, closing
    the race a plain count-then-insert has under FastAPI's thread pool.
    Only logs a timestamp -- never call content -- same privacy guarantee
    as checks themselves.
    """
    with cursor() as cur:
        cur.execute("select pg_advisory_xact_lock(hashtext(%(id)s::text))", {"id": user_id})
        cur.execute(
            "select count(*) as n from ai_calls where user_id = %(id)s and created_at > now() - interval '1 hour'",
            {"id": user_id},
        )
        if cur.fetchone()["n"] >= _MAX_AI_CALLS_PER_HOUR:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You’ve asked a lot just now — try again in a bit.")
        cur.execute("insert into ai_calls (user_id) values (%(id)s)", {"id": user_id})


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Profile ----------


@app.get("/me")
def get_me(user: User):
    return user.row


class ProfilePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    simpleMode: bool | None = None
    suburb: str | None = None


_PROFILE_COLUMNS = {"name": "name", "phone": "phone", "simpleMode": "simple_mode", "suburb": "suburb"}


@app.patch("/me")
def update_me(body: ProfilePatch, user: User):
    patch = body.model_dump(exclude_unset=True)
    if "suburb" in patch:
        _require_suburb(patch["suburb"])
    if patch:
        set_clause = ", ".join(f"{_PROFILE_COLUMNS[k]} = %({k})s" for k in patch)
        execute(f"update profiles set {set_clause} where id = %(id)s", {**patch, "id": user.id})
    return one(
        """select id, name, email, phone, role, simple_mode as "simpleMode", suburb
           from profiles where id = %(id)s""",
        {"id": user.id},
    )


# ---------- Checks ----------

_CHECK_FIELDS = """id, user_id as "userId", kind, verdict, confidence, scam_type as "scamType",
    headline, reasons, next_steps as "nextSteps", say_this as "sayThis", created_at as "createdAt" """


class ImageInput(BaseModel):
    base64: str
    mediaType: str


class CheckInput(BaseModel):
    kind: Literal["message", "call"]
    text: str | None = Field(default=None, max_length=4000)
    image: ImageInput | None = None


@app.post("/checks")
def create_check(body: CheckInput, user: User):
    _check_rate_limit(user.id)

    try:
        result = ai.run_check(body.kind, body.text, body.image.model_dump() if body.image else None)
    except ai.CheckFailed:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The checker is unavailable right now.")

    row = one(
        f"""insert into checks (user_id, kind, verdict, confidence, scam_type, headline, reasons, next_steps, say_this)
            values (%(userId)s, %(kind)s, %(verdict)s, %(confidence)s, %(scamType)s, %(headline)s, %(reasons)s, %(nextSteps)s, %(sayThis)s)
            returning {_CHECK_FIELDS}""",
        {**result, "userId": user.id},
    )

    # Consent-based alerts: a Stop reaches guardians only where the protected person chose to share it.
    if row["verdict"] == "stop":
        share_col = "share_calls" if row["kind"] == "call" else "share_verdicts"
        links = query(
            f"""select l.id, p.name as guardian_name from guardian_links l join profiles p on p.id = l.guardian_id
                where l.protected_id = %(id)s and l.status = 'active' and l.{share_col}""",
            {"id": user.id},
        )
        detail = f"Got a Stop {'during a call' if row['kind'] == 'call' else 'on a message'}: {row['headline']}"
        for link in links:
            _push_alert(link["id"], user.row["name"], "stop_verdict", row["id"], detail)

    return row


@app.get("/checks")
def list_my_checks(user: User):
    return query(f"select {_CHECK_FIELDS} from checks where user_id = %(id)s order by created_at desc", {"id": user.id})


@app.get("/checks/{check_id}")
def get_check(check_id: uuid.UUID, user: User):
    row = one(f"select {_CHECK_FIELDS} from checks where id = %(id)s and user_id = %(uid)s", {"id": check_id, "uid": user.id})
    return _found(row, "We couldn’t find that check.")


@app.post("/checks/{check_id}/alert")
def alert_guardians(check_id: uuid.UUID, user: User):
    """"Tell my family": the person chose to share this one, so it goes regardless of default sharing."""
    check = one(f"select {_CHECK_FIELDS} from checks where id = %(id)s and user_id = %(uid)s", {"id": check_id, "uid": user.id})
    check = _found(check, "We couldn’t find that check.")
    links = query(
        "select l.id, p.name as guardian_name from guardian_links l join profiles p on p.id = l.guardian_id "
        "where l.protected_id = %(id)s and l.status = 'active'",
        {"id": user.id},
    )
    if not links:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You haven’t linked any family yet.")
    detail = f"Asked you to look at a {'message' if check['verdict'] == 'safe' else 'possible scam'}"
    for link in links:
        _push_alert(link["id"], user.row["name"], "asked_for_help", check_id, detail)
    return [link["guardian_name"] for link in links]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=500)


class AskInput(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)


@app.post("/checks/{check_id}/messages")
def ask_about_check(check_id: uuid.UUID, body: AskInput, user: User):
    check = one(f"select {_CHECK_FIELDS} from checks where id = %(id)s and user_id = %(uid)s", {"id": check_id, "uid": user.id})
    check = _found(check, "We couldn’t find that check.")
    _check_rate_limit(user.id)
    try:
        answer = ai.ask_about_check(check, [t.model_dump() for t in body.history], body.question)
    except ai.CheckFailed:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Couldn’t answer that right now.")
    return {"answer": answer}


class TranscribeInput(BaseModel):
    audioUri: str


@app.post("/transcribe")
def transcribe(body: TranscribeInput, user: User):
    return {"text": ai.transcribe(body.audioUri)}


# ---------- Reports ----------

_REPORT_FIELDS = """id, reporter_id as "reporterId", check_id as "checkId", channel, scam_type as "scamType",
    description, sender, suburb, status, reject_reason as "rejectReason", created_at as "createdAt" """


class ReportInput(BaseModel):
    channel: Channel
    scamType: ScamType
    description: str = Field(min_length=10, max_length=1000)
    sender: str | None = Field(default=None, max_length=200)
    suburb: str
    checkId: uuid.UUID | None = None


@app.get("/reports")
def list_my_reports(user: User):
    return query(f"select {_REPORT_FIELDS} from reports where reporter_id = %(id)s order by created_at desc", {"id": user.id})


@app.get("/reports/{report_id}")
def get_report(report_id: uuid.UUID, user: User):
    row = one(f"select {_REPORT_FIELDS} from reports where id = %(id)s and reporter_id = %(uid)s", {"id": report_id, "uid": user.id})
    return _found(row, "We couldn’t find that report.")


@app.post("/reports")
def create_report(body: ReportInput, user: User):
    _require_suburb(body.suburb)
    return one(
        f"""insert into reports (reporter_id, check_id, channel, scam_type, description, sender, suburb)
            values (%(reporterId)s, %(checkId)s, %(channel)s, %(scamType)s, %(description)s, %(sender)s, %(suburb)s)
            returning {_REPORT_FIELDS}""",
        {**body.model_dump(), "reporterId": user.id, "sender": (body.sender or "").strip() or None},
    )


@app.put("/reports/{report_id}")
def update_report(report_id: uuid.UUID, body: ReportInput, user: User):
    _require_suburb(body.suburb)
    # Edited reports go back to review so an approved report can't be changed into something abusive.
    row = one(
        f"""update reports set channel = %(channel)s, scam_type = %(scamType)s, description = %(description)s,
            sender = %(sender)s, suburb = %(suburb)s, status = 'pending', reject_reason = null
            where id = %(id)s and reporter_id = %(uid)s
            returning {_REPORT_FIELDS}""",
        {**body.model_dump(), "id": report_id, "uid": user.id, "sender": (body.sender or "").strip() or None},
    )
    return _found(row, "We couldn’t find that report.")


@app.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: uuid.UUID, user: User):
    row = one("delete from reports where id = %(id)s and reporter_id = %(uid)s returning id", {"id": report_id, "uid": user.id})
    _found(row, "We couldn’t find that report.")


# ---------- Map & awareness ----------


@app.get("/suburbs")
def list_suburbs():
    return query('select name, city, lat, lng from suburbs order by name')


@app.get("/areas")
def list_area_stats(scamType: ScamType | None = None, channel: Channel | None = None):
    return query(
        """select s.name, s.city, s.lat, s.lng, count(*) as count,
               mode() within group (order by r.scam_type) as "topType"
           from reports r join suburbs s on s.name = r.suburb
           where r.status = 'approved'
             and (%(scamType)s::scam_type is null or r.scam_type = %(scamType)s::scam_type)
             and (%(channel)s::channel is null or r.channel = %(channel)s::channel)
           group by s.name, s.city, s.lat, s.lng
           order by count desc""",
        {"scamType": scamType, "channel": channel},
    )


@app.get("/circulating")
def list_circulating(user: User):
    return query(
        """select r.scam_type as "scamType", count(*) as count,
               count(*) filter (where r.suburb = %(suburb)s) as "nearYou",
               max(r.created_at) as "latestAt"
           from reports r
           where r.status = 'approved' and r.created_at >= now() - interval '14 days'
           group by r.scam_type
           order by "nearYou" desc, count desc
           limit 4""",
        {"suburb": user.row["suburb"]},
    )


# ---------- Family ----------

_LINK_FIELDS = """l.id, l.guardian_id as "guardianId", gp.name as "guardianName", gp.phone as "guardianPhone",
    l.protected_id as "protectedId", l.protected_name as "protectedName", l.invited_phone as "invitedPhone",
    l.code, l.status, l.share_calls as "shareCalls", l.share_verdicts as "shareVerdicts" """
_LINK_JOIN = "from guardian_links l join profiles gp on gp.id = l.guardian_id"
# UPDATE ... SET ... FROM can't re-mention the target table, so updates join
# only the extra table (profiles) and reference the target by its alias.
_LINK_UPDATE_FROM = "from profiles gp where gp.id = l.guardian_id"


@app.get("/family")
def get_family(user: User):
    return {
        "lookingAfter": query(f"select {_LINK_FIELDS} {_LINK_JOIN} where l.guardian_id = %(id)s", {"id": user.id}),
        "lookedAfterBy": query(f"select {_LINK_FIELDS} {_LINK_JOIN} where l.protected_id = %(id)s", {"id": user.id}),
    }


class InviteInput(BaseModel):
    name: str
    phone: str


@app.post("/invites")
def create_invite(body: InviteInput, user: User):
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    execute(
        """insert into guardian_links (guardian_id, protected_name, invited_phone, code)
           values (%(guardianId)s, %(name)s, %(phone)s, %(code)s)""",
        {"guardianId": user.id, "name": body.name.strip(), "phone": re.sub(r"\s", "", body.phone), "code": code},
    )
    return {"code": code}


@app.get("/invites/{code}")
def get_invite(code: str):
    row = one(
        f"select {_LINK_FIELDS} {_LINK_JOIN} where l.code = %(code)s and l.status = 'pending' and l.created_at > now() - interval '7 days'",
        {"code": code.strip().upper()},
    )
    row = _found(row, "This invite has expired or was already used.")
    return {"guardianName": row["guardianName"], "code": row["code"]}


class ShareInput(BaseModel):
    shareCalls: bool
    shareVerdicts: bool


@app.post("/invites/{code}/accept")
def accept_invite(code: str, body: ShareInput, user: User):
    link = one(f"select {_LINK_FIELDS} {_LINK_JOIN} where l.code = %(code)s and l.status = 'pending' and l.created_at > now() - interval '7 days'", {"code": code.strip().upper()})
    link = _found(link, "This invite has expired or was already used.")
    if link["guardianId"] == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can’t accept your own invite.")
    dup = one(
        "select id from guardian_links where guardian_id = %(gid)s and protected_id = %(pid)s",
        {"gid": link["guardianId"], "pid": user.id},
    )
    if dup:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{link['guardianName']} is already looking out for you.")

    row = one(
        f"""update guardian_links l set protected_id = %(uid)s, protected_name = %(name)s, status = 'active',
            share_calls = %(shareCalls)s, share_verdicts = %(shareVerdicts)s
            {_LINK_UPDATE_FROM} and l.id = %(id)s
            returning {_LINK_FIELDS}""",
        {"uid": user.id, "name": user.row["name"], "shareCalls": body.shareCalls, "shareVerdicts": body.shareVerdicts, "id": link["id"]},
    )
    _push_alert(link["id"], user.row["name"], "invite_accepted", None, "Accepted your invite")
    return row


@app.patch("/links/{link_id}")
def update_sharing(link_id: uuid.UUID, body: ShareInput, user: User):
    row = one(
        f"""update guardian_links l set share_calls = %(shareCalls)s, share_verdicts = %(shareVerdicts)s
            {_LINK_UPDATE_FROM} and l.id = %(id)s and l.protected_id = %(uid)s
            returning {_LINK_FIELDS}""",
        {"shareCalls": body.shareCalls, "shareVerdicts": body.shareVerdicts, "id": link_id, "uid": user.id},
    )
    return _found(row, "We couldn’t find that family link.")


@app.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_link(link_id: uuid.UUID, user: User):
    row = one(
        "delete from guardian_links where id = %(id)s and (protected_id = %(uid)s or guardian_id = %(uid)s) returning id",
        {"id": link_id, "uid": user.id},
    )
    _found(row, "We couldn’t find that family link.")


# ---------- Alerts ----------

_ALERT_FIELDS = """a.id, link_id as "linkId", person_name as "personName", type, check_id as "checkId",
    detail, seen, a.created_at as "createdAt" """


def _push_alert(link_id: str, person_name: str, alert_type: str, check_id: str | None, detail: str):
    execute(
        f"""insert into alerts (link_id, person_name, type, check_id, detail)
            values (%(linkId)s, %(personName)s, %(type)s, %(checkId)s, %(detail)s)""",
        {"linkId": link_id, "personName": person_name, "type": alert_type, "checkId": check_id, "detail": detail},
    )


@app.get("/alerts")
def list_alerts(user: User):
    return query(
        f"""select {_ALERT_FIELDS} from alerts a join guardian_links l on l.id = a.link_id
            where l.guardian_id = %(id)s order by a.created_at desc""",
        {"id": user.id},
    )


@app.post("/alerts/seen")
def mark_alerts_seen(user: User):
    execute(
        "update alerts set seen = true where link_id in (select id from guardian_links where guardian_id = %(id)s)",
        {"id": user.id},
    )
    return {"ok": True}


# ---------- Admin: dashboard ----------

_ACTIVITY_SQL = """
    (select 'check' as type, id::text as id, headline as summary, created_at as "createdAt" from checks)
    union all
    (select 'report' as type, id::text as id, description as summary, created_at as "createdAt" from reports)
    union all
    (select 'signup' as type, id::text as id, name as summary, created_at as "createdAt" from profiles)
    order by "createdAt" desc
    limit 20
"""

_TREND_SQL = """
    select to_char(d.day, 'YYYY-MM-DD') as date, coalesce(r.n, 0) as count
    from generate_series(current_date - interval '13 days', current_date, interval '1 day') as d(day)
    left join (
        select date_trunc('day', created_at)::date as day, count(*) as n
        from reports where created_at > now() - interval '14 days'
        group by day
    ) r on r.day = d.day
    order by d.day
"""


@app.get("/admin/dashboard")
def admin_dashboard(_: Admin):
    users_by_role = {"protected": 0, "guardian": 0, "admin": 0}
    for r in query("select role, count(*) as n from profiles group by role"):
        users_by_role[r["role"]] = r["n"]

    checks_by_verdict = {"stop": 0, "wait": 0, "safe": 0}
    for r in query("select verdict, count(*) as n from checks group by verdict"):
        checks_by_verdict[r["verdict"]] = r["n"]

    reports_by_status = {"pending": 0, "approved": 0, "rejected": 0}
    for r in query("select status, count(*) as n from reports group by status"):
        reports_by_status[r["status"]] = r["n"]

    checks_last_7_days = one("select count(*) as n from checks where created_at > now() - interval '7 days'")["n"]
    ai_calls_last_24h = one("select count(*) as n from ai_calls where created_at > now() - interval '24 hours'")["n"]

    return {
        "users": {"total": sum(users_by_role.values()), "byRole": users_by_role},
        "checks": {"total": sum(checks_by_verdict.values()), "byVerdict": checks_by_verdict, "last7Days": checks_last_7_days},
        "reports": {"total": sum(reports_by_status.values()), "byStatus": reports_by_status},
        "aiCallsLast24h": ai_calls_last_24h,
        "trend": query(_TREND_SQL),
        "activity": query(_ACTIVITY_SQL),
    }


# ---------- Admin: reports (full CRUD + moderation) ----------

_ADMIN_REPORT_FIELDS = _REPORT_FIELDS + ', moderated_by as "moderatedBy", moderated_at as "moderatedAt"'


@app.get("/admin/reports")
def list_all_reports(
    _: Admin, status: ReportStatus | None = None, scamType: ScamType | None = None, search: str | None = None, limit: int = 50, offset: int = 0
):
    pattern = f"%{search}%" if search else None
    return query(
        f"""select {_ADMIN_REPORT_FIELDS} from reports
            where (%(status)s::report_status is null or status = %(status)s::report_status)
              and (%(scamType)s::scam_type is null or scam_type = %(scamType)s::scam_type)
              and (%(pattern)s::text is null or description ilike %(pattern)s)
            order by created_at desc
            limit %(limit)s offset %(offset)s""",
        {"status": status, "scamType": scamType, "pattern": pattern, "limit": limit, "offset": offset},
    )


@app.get("/admin/reports/{report_id}")
def admin_get_report(report_id: uuid.UUID, _: Admin):
    row = one(f"select {_ADMIN_REPORT_FIELDS} from reports where id = %(id)s", {"id": report_id})
    return _found(row, "That report no longer exists.")


@app.put("/admin/reports/{report_id}")
def admin_update_report(report_id: uuid.UUID, body: ReportInput, _: Admin):
    """Unlike a reporter's own edit, an admin correction doesn't reset status to pending -- it IS the review."""
    _require_suburb(body.suburb)
    row = one(
        f"""update reports set channel = %(channel)s, scam_type = %(scamType)s, description = %(description)s,
            sender = %(sender)s, suburb = %(suburb)s
            where id = %(id)s returning {_ADMIN_REPORT_FIELDS}""",
        {**body.model_dump(), "id": report_id, "sender": (body.sender or "").strip() or None},
    )
    return _found(row, "That report no longer exists.")


@app.delete("/admin/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_report(report_id: uuid.UUID, _: Admin):
    row = one("delete from reports where id = %(id)s returning id", {"id": report_id})
    _found(row, "That report no longer exists.")


class ModerateInput(BaseModel):
    decision: Literal["approved", "rejected"]
    reason: str | None = None


@app.post("/admin/reports/{report_id}/moderate")
def moderate_report(report_id: uuid.UUID, body: ModerateInput, admin: Admin):
    reject_reason = (body.reason or "").strip() or None if body.decision == "rejected" else None
    row = one(
        f"""update reports set status = %(decision)s, reject_reason = %(reason)s,
            moderated_by = %(adminId)s, moderated_at = now()
            where id = %(id)s returning {_ADMIN_REPORT_FIELDS}""",
        {"decision": body.decision, "reason": reject_reason, "id": report_id, "adminId": admin.id},
    )
    return _found(row, "That report no longer exists.")


# ---------- Admin: users ----------

_USER_FIELDS = """id, name, email, phone, role, simple_mode as "simpleMode", suburb, created_at as "createdAt" """


@app.get("/admin/users")
def list_users(_: Admin, search: str | None = None, role: Role | None = None, limit: int = 50, offset: int = 0):
    pattern = f"%{search}%" if search else None
    return query(
        f"""select {_USER_FIELDS} from profiles
            where (%(pattern)s::text is null or name ilike %(pattern)s or email ilike %(pattern)s)
              and (%(role)s::role is null or role = %(role)s::role)
            order by created_at desc
            limit %(limit)s offset %(offset)s""",
        {"pattern": pattern, "role": role, "limit": limit, "offset": offset},
    )


@app.get("/admin/users/{user_id}")
def get_user(user_id: uuid.UUID, _: Admin):
    row = one(f"select {_USER_FIELDS} from profiles where id = %(id)s", {"id": user_id})
    return _found(row, "We couldn’t find that user.")


def _is_last_admin(user_id: uuid.UUID) -> bool:
    target = one("select role from profiles where id = %(id)s", {"id": user_id})
    if not target or target["role"] != "admin":
        return False
    remaining = one("select count(*) as n from profiles where role = 'admin' and id != %(id)s", {"id": user_id})
    return remaining["n"] == 0


class RoleInput(BaseModel):
    role: Role


@app.patch("/admin/users/{user_id}")
def update_user_role(user_id: uuid.UUID, body: RoleInput, admin: Admin):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can’t change your own role.")
    if body.role != "admin" and _is_last_admin(user_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can’t remove the last admin.")
    row = one(f"update profiles set role = %(role)s where id = %(id)s returning {_USER_FIELDS}", {"role": body.role, "id": user_id})
    return _found(row, "We couldn’t find that user.")


@app.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: uuid.UUID, admin: Admin):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can’t delete your own account.")
    if not one("select 1 from profiles where id = %(id)s", {"id": user_id}):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "We couldn’t find that user.")
    if _is_last_admin(user_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can’t delete the last admin.")
    # Deleting only the profile row would orphan a still-signable-in auth account;
    # deleting the auth user cascades to profiles (and from there to their checks,
    # reports, guardian links and alerts).
    settings = get_settings()
    res = httpx.delete(
        f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
        headers={"apikey": settings.supabase_service_role_key, "Authorization": f"Bearer {settings.supabase_service_role_key}"},
    )
    if res.status_code not in (200, 204):
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Couldn’t delete that account right now.")


# ---------- Admin: explainers (Learn content) ----------

_EXPLAINER_FIELDS = """id, slug, scam_type as "scamType", title, summary,
    example_channel as "exampleChannel", example_text as "exampleText",
    signs, what_to_do as "whatToDo", source_name as "sourceName", source_url as "sourceUrl" """


def _shape_explainer(row: dict) -> dict:
    return {
        "id": row["id"],
        "slug": row["slug"],
        "scamType": row["scamType"],
        "title": row["title"],
        "summary": row["summary"],
        "example": {"channel": row["exampleChannel"], "text": row["exampleText"]},
        "signs": row["signs"],
        "whatToDo": row["whatToDo"],
        "source": {"name": row["sourceName"], "url": row["sourceUrl"]},
    }


@app.get("/explainers")
def list_explainers():
    return [_shape_explainer(r) for r in query(f"select {_EXPLAINER_FIELDS} from explainers order by title")]


@app.get("/explainers/{slug}")
def get_explainer(slug: str):
    row = one(f"select {_EXPLAINER_FIELDS} from explainers where slug = %(slug)s", {"slug": slug})
    return _shape_explainer(_found(row, "We couldn’t find that guide."))


class ExplainerInput(BaseModel):
    slug: str = Field(min_length=1, max_length=60, pattern=r"^[a-z0-9-]+$")
    scamType: ScamType
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=500)
    exampleChannel: Channel
    exampleText: str = Field(min_length=1, max_length=1000)
    signs: list[str] = Field(min_length=1, max_length=10)
    whatToDo: list[str] = Field(min_length=1, max_length=10)
    sourceName: str = Field(min_length=1, max_length=200)
    sourceUrl: str = Field(min_length=1, max_length=500)


@app.post("/admin/explainers")
def create_explainer(body: ExplainerInput, _: Admin):
    try:
        row = one(
            f"""insert into explainers (slug, scam_type, title, summary, example_channel, example_text, signs, what_to_do, source_name, source_url)
                values (%(slug)s, %(scamType)s, %(title)s, %(summary)s, %(exampleChannel)s, %(exampleText)s, %(signs)s, %(whatToDo)s, %(sourceName)s, %(sourceUrl)s)
                returning {_EXPLAINER_FIELDS}""",
            body.model_dump(),
        )
    except UniqueViolation:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That slug is already used.")
    return _shape_explainer(row)


@app.put("/admin/explainers/{explainer_id}")
def update_explainer(explainer_id: uuid.UUID, body: ExplainerInput, _: Admin):
    try:
        row = one(
            f"""update explainers set slug = %(slug)s, scam_type = %(scamType)s, title = %(title)s, summary = %(summary)s,
                example_channel = %(exampleChannel)s, example_text = %(exampleText)s, signs = %(signs)s, what_to_do = %(whatToDo)s,
                source_name = %(sourceName)s, source_url = %(sourceUrl)s
                where id = %(id)s returning {_EXPLAINER_FIELDS}""",
            {**body.model_dump(), "id": explainer_id},
        )
    except UniqueViolation:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That slug is already used.")
    return _shape_explainer(_found(row, "We couldn’t find that guide."))


@app.delete("/admin/explainers/{explainer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_explainer(explainer_id: uuid.UUID, _: Admin):
    row = one("delete from explainers where id = %(id)s returning id", {"id": explainer_id})
    _found(row, "We couldn’t find that guide.")


# ---------- Admin: suburbs ----------


class SuburbCreateInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    lat: float
    lng: float


class SuburbUpdateInput(BaseModel):
    city: str = Field(min_length=1, max_length=100)
    lat: float
    lng: float


@app.post("/admin/suburbs")
def create_suburb(body: SuburbCreateInput, _: Admin):
    try:
        return one("insert into suburbs (name, city, lat, lng) values (%(name)s, %(city)s, %(lat)s, %(lng)s) returning name, city, lat, lng", body.model_dump())
    except UniqueViolation:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A suburb with that name already exists.")


@app.put("/admin/suburbs/{name}")
def update_suburb(name: str, body: SuburbUpdateInput, _: Admin):
    row = one(
        "update suburbs set city = %(city)s, lat = %(lat)s, lng = %(lng)s where name = %(name)s returning name, city, lat, lng",
        {**body.model_dump(), "name": name},
    )
    return _found(row, "We couldn’t find that suburb.")


@app.delete("/admin/suburbs/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suburb(name: str, _: Admin):
    try:
        row = one("delete from suburbs where name = %(name)s returning name", {"name": name})
    except ForeignKeyViolation:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can’t delete — people or reports still use this suburb.")
    _found(row, "We couldn’t find that suburb.")
