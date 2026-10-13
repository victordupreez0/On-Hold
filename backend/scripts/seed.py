"""Idempotent demo seed: 3 demo accounts, a family link, a few checks and
alerts, and ~60 approved community reports for the map. Run with:

    uv run python -m scripts.seed

Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (admin API, creates the auth
users) and DATABASE_URL (everything else) in backend/.env.
"""

import random
from datetime import UTC, datetime, timedelta

import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.db import execute, one

DEMO_PASSWORD = "onhold-demo"


class SeedSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    supabase_url: str
    supabase_service_role_key: str


def ago(hours: float) -> datetime:
    return datetime.now(UTC) - timedelta(hours=hours)


def get_or_create_user(client: httpx.Client, email: str, name: str) -> str:
    existing = client.get("/auth/v1/admin/users", params={"page": 1, "per_page": 200}).json()
    for u in existing.get("users", []):
        if u["email"] == email:
            return u["id"]
    created = client.post(
        "/auth/v1/admin/users",
        json={"email": email, "password": DEMO_PASSWORD, "email_confirm": True, "user_metadata": {"name": name}},
    )
    created.raise_for_status()
    return created.json()["id"]


def main():
    settings = SeedSettings()
    client = httpx.Client(
        base_url=settings.supabase_url,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        },
        timeout=30,
    )

    marie_id = get_or_create_user(client, "marie@onhold.test", "Marie")
    pieter_id = get_or_create_user(client, "pieter@onhold.test", "Pieter")
    admin_id = get_or_create_user(client, "admin@onhold.test", "Lerato")

    # The signup trigger only grants protected/guardian; promote + fill in
    # the demo-specific fields it doesn't know about.
    execute("update profiles set phone = '0821234567', suburb = 'Bellville' where id = %(id)s", {"id": marie_id})
    execute(
        "update profiles set role = 'guardian', phone = '0839876543', suburb = 'Durbanville' where id = %(id)s",
        {"id": pieter_id},
    )
    execute("update profiles set role = 'admin', suburb = 'Sandton' where id = %(id)s", {"id": admin_id})

    link = one(
        """insert into guardian_links (guardian_id, protected_id, protected_name, invited_phone, code, status)
           values (%(g)s, %(p)s, 'Marie', '0821234567', 'MARIE1', 'active')
           on conflict (guardian_id, protected_id) do update set status = 'active'
           returning id""",
        {"g": pieter_id, "p": marie_id},
    )
    link_id = link["id"]
    execute(
        """insert into guardian_links (guardian_id, protected_name, invited_phone, code, status)
           values (%(g)s, 'Johan', '0825550000', 'JOHAN7', 'pending')
           on conflict (code) do nothing""",
        {"g": pieter_id},
    )

    if not one("select id from checks where id = '00000000-0000-0000-0000-00000000c001'"):
        check1 = one(
            """insert into checks (id, user_id, kind, verdict, confidence, scam_type, headline, reasons, next_steps, created_at)
               values ('00000000-0000-0000-0000-00000000c001', %(u)s, 'message', 'stop', 0.9, 'aarto',
                       'This looks like a fake traffic fine',
                       array['Fine SMS links never come from AARTO directly', 'The urgency and discount are pressure tactics'],
                       array['Don’t click the link', 'Check real fines at the eNaTIS website'],
                       %(t)s)
               returning id""",
            {"u": marie_id, "t": ago(3)},
        )
        execute(
            """insert into checks (user_id, kind, verdict, confidence, scam_type, headline, reasons, next_steps, say_this, created_at)
               values (%(u)s, 'call', 'stop', 0.95, 'bank',
                       'This is a fake bank fraud call',
                       array['Banks never ask for your OTP over the phone', 'You were pressured to act immediately'],
                       array['Hang up now', 'Phone your bank on the number on your card'],
                       %(say)s, %(t)s)""",
            {"u": marie_id, "say": "I don't do this over the phone. I'll phone you back on an official number. Goodbye.", "t": ago(30)},
        )
        for alert_type, check_id, detail, seen, hours in [
            ("stop_verdict", check1["id"], "Got a Stop on a fake traffic fine SMS", False, 3),
            ("invite_accepted", None, "Accepted your invite", True, 24 * 9),
        ]:
            execute(
                """insert into alerts (link_id, person_name, type, check_id, detail, seen, created_at)
                   values (%(l)s, 'Marie', %(ty)s, %(c)s, %(d)s, %(s)s, %(t)s)""",
                {"l": link_id, "ty": alert_type, "c": check_id, "d": detail, "s": seen, "t": ago(hours)},
            )

    seed_reports(admin_id, marie_id)
    print("Seed complete.")


SAMPLE_TEXT = {
    "bank": ["Caller said he was from the fraud department and asked for the OTP.", "Told to approve a notification in the app to “stop” a payment."],
    "sassa": ["SMS said my SRD payment is on hold and to update details on a link.", "WhatsApp offering to fast-track a grant for a R100 fee."],
    "sars": ["Email saying I have a refund of R3,214, with a link to verify my bank details."],
    "aarto": ["SMS with my registration number offering 50% off a fine if I pay today.", "WhatsApp saying my licence disc will be blocked unless I pay R250."],
    "family": ["“Hi Ma, this is my new number”, then asked for R2,500 urgently.", "Pretended to be my grandson, said he was in trouble and needed money."],
    "courier": ["SMS about a parcel needing a R28.50 redelivery fee."],
    "jobs": ["Offered R800 a day to like YouTube videos, then asked for a deposit."],
    "debicheck": ["Caller about “funeral cover” told me to approve the bank SMS."],
    "investment": ["WhatsApp group promising to double my money with crypto in a week."],
    "other": ["Suspicious message asking for my ID number."],
}

# [suburb, type, channel, how many] -> approved community reports spread over the last 2 weeks.
SEED_COUNTS = [
    ("Soweto", "sassa", "sms", 6),
    ("Soweto", "bank", "call", 3),
    ("Centurion", "aarto", "sms", 7),
    ("Bellville", "family", "whatsapp", 5),
    ("Bellville", "aarto", "sms", 3),
    ("Sandton", "investment", "whatsapp", 4),
    ("Sandton", "jobs", "whatsapp", 3),
    ("Umhlanga", "bank", "call", 6),
    ("Hatfield", "courier", "sms", 5),
    ("Mamelodi", "sassa", "whatsapp", 5),
    ("Durbanville", "debicheck", "call", 5),
    ("Mitchells Plain", "jobs", "whatsapp", 3),
    ("Pinetown", "courier", "sms", 2),
]


def seed_reports(community_reporter_id: str, marie_id: str):
    if one("select id from reports limit 1"):
        return  # already seeded

    rows = []
    for suburb, scam_type, channel, count in SEED_COUNTS:
        for i in range(count):
            rows.append(
                (
                    community_reporter_id,
                    channel,
                    scam_type,
                    SAMPLE_TEXT[scam_type][i % len(SAMPLE_TEXT[scam_type])],
                    suburb,
                    "approved",
                    ago(random.randint(2, 300)),
                )
            )
    extra = [
        (marie_id, "sms", "aarto", "SMS with my registration number offering 50% off if I paid today.", "Bellville", "approved", ago(2)),
        (community_reporter_id, "sms", "courier", "Parcel redelivery fee link, I wasn’t expecting anything.", "Hatfield", "pending", ago(5)),
        (community_reporter_id, "call", "bank", "Man from “Capitec fraud” asked me to read out the code.", "Randburg", "pending", ago(8)),
        (community_reporter_id, "whatsapp", "other", "This number is my ex, he is a scammer!!", "Sea Point", "pending", ago(9)),
    ]
    for reporter_id, channel, scam_type, description, suburb, status, created_at in rows + extra:
        execute(
            """insert into reports (reporter_id, channel, scam_type, description, suburb, status, created_at)
               values (%(r)s, %(c)s, %(s)s, %(d)s, %(sub)s, %(st)s, %(t)s)""",
            {"r": reporter_id, "c": channel, "s": scam_type, "d": description, "sub": suburb, "st": status, "t": created_at},
        )


if __name__ == "__main__":
    main()
