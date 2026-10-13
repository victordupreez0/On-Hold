"""On Hold API. Routes mirror mobile/src/api.ts 1:1 -- same functions, same
error messages, same business rules -- so the frontend's api.ts wrapper can
become a thin fetch layer without touching any screen.
"""

import random
import re
import string
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import ai
from .auth import CurrentUser, current_user, require_admin
from .config import get_settings
from .db import execute, one, query

app = FastAPI(title="On Hold API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

Channel = Literal["sms", "whatsapp", "email", "call"]
ScamType = Literal["bank", "sassa", "sars", "aarto", "family", "courier", "jobs", "debicheck", "investment", "other"]

User = Annotated[CurrentUser, Depends(current_user)]
Admin = Annotated[CurrentUser, Depends(require_admin)]


def _found(row: dict | None, message: str) -> dict:
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, message)
    return row


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Profile ----------


@app.get("/me")
def get_me(user: User):
    return user.row


class ProfilePatch(BaseModel):
    name: str | None = None
    phone: str | None = None
    simpleMode: bool | None = None
    suburb: str | None = None


_PROFILE_COLUMNS = {"name": "name", "phone": "phone", "simpleMode": "simple_mode", "suburb": "suburb"}


@app.patch("/me")
def update_me(body: ProfilePatch, user: User):
    patch = body.model_dump(exclude_unset=True)
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
_MAX_CHECKS_PER_HOUR = 30


class ImageInput(BaseModel):
    base64: str
    mediaType: str


class CheckInput(BaseModel):
    kind: Literal["message", "call"]
    text: str | None = None
    image: ImageInput | None = None


@app.post("/checks")
def create_check(body: CheckInput, user: User):
    recent = one(
        "select count(*) as n from checks where user_id = %(id)s and created_at > now() - interval '1 hour'",
        {"id": user.id},
    )
    if recent and recent["n"] >= _MAX_CHECKS_PER_HOUR:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You’ve checked a lot just now — try again in a bit.")

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
def get_check(check_id: str, user: User):
    row = one(f"select {_CHECK_FIELDS} from checks where id = %(id)s and user_id = %(uid)s", {"id": check_id, "uid": user.id})
    return _found(row, "We couldn’t find that check.")


@app.post("/checks/{check_id}/alert")
def alert_guardians(check_id: str, user: User):
    """"Tell my family": the person chose to share this one, so it goes regardless of default sharing."""
    check = one(f"select {_CHECK_FIELDS} from checks where id = %(id)s and user_id = %(uid)s", {"id": check_id, "uid": user.id})
    links = query(
        "select l.id, p.name as guardian_name from guardian_links l join profiles p on p.id = l.guardian_id "
        "where l.protected_id = %(id)s and l.status = 'active'",
        {"id": user.id},
    )
    if not links:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You haven’t linked any family yet.")
    scam_word = "message" if not check or check["verdict"] == "safe" else "possible scam"
    detail = f"Asked you to look at a {scam_word}"
    for link in links:
        _push_alert(link["id"], user.row["name"], "asked_for_help", check_id, detail)
    return [link["guardian_name"] for link in links]


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
    sender: str | None = None
    suburb: str
    checkId: str | None = None


@app.get("/reports")
def list_my_reports(user: User):
    return query(f"select {_REPORT_FIELDS} from reports where reporter_id = %(id)s order by created_at desc", {"id": user.id})


@app.get("/reports/{report_id}")
def get_report(report_id: str, user: User):
    row = one(f"select {_REPORT_FIELDS} from reports where id = %(id)s and reporter_id = %(uid)s", {"id": report_id, "uid": user.id})
    return _found(row, "We couldn’t find that report.")


@app.post("/reports")
def create_report(body: ReportInput, user: User):
    return one(
        f"""insert into reports (reporter_id, check_id, channel, scam_type, description, sender, suburb)
            values (%(reporterId)s, %(checkId)s, %(channel)s, %(scamType)s, %(description)s, %(sender)s, %(suburb)s)
            returning {_REPORT_FIELDS}""",
        {**body.model_dump(), "reporterId": user.id, "sender": (body.sender or "").strip() or None},
    )


@app.put("/reports/{report_id}")
def update_report(report_id: str, body: ReportInput, user: User):
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
def delete_report(report_id: str, user: User):
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
        f"select {_LINK_FIELDS} {_LINK_JOIN} where l.code = %(code)s and l.status = 'pending'",
        {"code": code.strip().upper()},
    )
    row = _found(row, "This invite has expired or was already used.")
    return {"guardianName": row["guardianName"], "code": row["code"]}


class ShareInput(BaseModel):
    shareCalls: bool
    shareVerdicts: bool


@app.post("/invites/{code}/accept")
def accept_invite(code: str, body: ShareInput, user: User):
    link = one(f"select {_LINK_FIELDS} {_LINK_JOIN} where l.code = %(code)s and l.status = 'pending'", {"code": code.strip().upper()})
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
def update_sharing(link_id: str, body: ShareInput, user: User):
    row = one(
        f"""update guardian_links l set share_calls = %(shareCalls)s, share_verdicts = %(shareVerdicts)s
            {_LINK_UPDATE_FROM} and l.id = %(id)s and l.protected_id = %(uid)s
            returning {_LINK_FIELDS}""",
        {"shareCalls": body.shareCalls, "shareVerdicts": body.shareVerdicts, "id": link_id, "uid": user.id},
    )
    return _found(row, "We couldn’t find that family link.")


@app.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_link(link_id: str, user: User):
    row = one(
        "delete from guardian_links where id = %(id)s and (protected_id = %(uid)s or guardian_id = %(uid)s) returning id",
        {"id": link_id, "uid": user.id},
    )
    _found(row, "We couldn’t find that family link.")


# ---------- Alerts ----------

_ALERT_FIELDS = """id, link_id as "linkId", person_name as "personName", type, check_id as "checkId",
    detail, seen, created_at as "createdAt" """


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


# ---------- Admin ----------


@app.get("/admin/reports/pending")
def list_pending_reports(_: Admin):
    return query(f"select {_REPORT_FIELDS} from reports where status = 'pending' order by created_at desc")


class ModerateInput(BaseModel):
    decision: Literal["approved", "rejected"]
    reason: str | None = None


@app.post("/admin/reports/{report_id}/moderate")
def moderate_report(report_id: str, body: ModerateInput, _: Admin):
    row = one(
        f"""update reports set status = %(decision)s,
            reject_reason = case when %(decision)s = 'rejected' then %(reason)s else null end
            where id = %(id)s returning {_REPORT_FIELDS}""",
        {"decision": body.decision, "reason": (body.reason or "").strip() or None, "id": report_id},
    )
    return _found(row, "That report no longer exists.")
