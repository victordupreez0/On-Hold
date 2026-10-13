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
    seed_explainers()
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


# Ported from mobile/src/fixtures.ts EXPLAINERS -- the Learn tab's content,
# now DB-backed and admin-editable instead of baked into the app bundle.
EXPLAINERS = [
    {
        "slug": "bank-fraud-call",
        "scam_type": "bank",
        "title": "The “bank fraud department” call",
        "summary": "Someone phones pretending to be your bank and says your money is in danger.",
        "example_channel": "call",
        "example_text": "“Good afternoon, this is Thandi from the fraud department. We’ve stopped a payment of R4,800. To reverse it, read me the code we just sent and approve the notification in your app.”",
        "signs": [
            "They ask for an OTP, PIN or password. Banks never do.",
            "They want you to “approve” something in your banking app to stop fraud.",
            "They already know some of your details, so they sound real.",
            "They keep you on the line and rush you.",
        ],
        "what_to_do": [
            "Hang up. A real bank will understand.",
            "Phone your bank yourself on the number on the back of your card.",
            "Shared a code or approved something? Call your bank immediately.",
        ],
        "source_name": "SABRIC",
        "source_url": "https://www.sabric.co.za/",
    },
    {
        "slug": "sassa-grant",
        "scam_type": "sassa",
        "title": "Fake SASSA grant messages",
        "summary": "Messages or calls about your grant or SRD payment that ask for your details or a fee.",
        "example_channel": "sms",
        "example_text": "SASSA: Your SRD R370 payment is ON HOLD. Update your details within 24hrs to avoid cancellation: srd-sassa-pay.co.za",
        "signs": [
            "SASSA never charges a fee to apply or to “unlock” a payment.",
            "The link isn’t srd.sassa.gov.za.",
            "They ask for your ID number, PIN or banking details.",
            "These messages often arrive just before payment dates.",
        ],
        "what_to_do": [
            "Don’t tap the link or reply.",
            "Phone SASSA yourself on 0800 60 10 11 (free, weekdays 08:00–16:00).",
            "Only use srd.sassa.gov.za, typed in yourself.",
        ],
        "source_name": "SAnews: SASSA warns beneficiaries",
        "source_url": "https://www.sanews.gov.za/node/60295",
    },
    {
        "slug": "sars-refund",
        "scam_type": "sars",
        "title": "Fake SARS refunds",
        "summary": "An email or SMS says you’re owed a tax refund and must “claim” it through a link.",
        "example_channel": "email",
        "example_text": "SARS eFiling: You are eligible for a refund of R3,214.60. Verify your banking details within 48 hours to receive payment.",
        "signs": [
            "SARS won’t ask for your personal, tax, banking or eFiling details in an email.",
            "Real refunds go into the account already on your SARS profile.",
            "“Claim now or lose it” pressure.",
        ],
        "what_to_do": [
            "Don’t open the link.",
            "Log in to eFiling yourself at sars.gov.za, or phone SARS on 0800 00 7277.",
            "Forward the message to phishing@sars.gov.za.",
        ],
        "source_name": "SARS scam warning",
        "source_url": "https://www.sars.gov.za/media-release/11-february-2013-warning-to-taxpayers-on-scams/",
    },
    {
        "slug": "aarto-fine",
        "scam_type": "aarto",
        "title": "Fake traffic fines (AARTO)",
        "summary": "An SMS or WhatsApp says you have a traffic fine and offers 50% off if you pay today.",
        "example_channel": "sms",
        "example_text": "AARTO: Outstanding fine R500 for vehicle CA 123-456. Pay within 24hrs for 50% discount or your licence disc will be blocked.",
        "signs": [
            "A big discount for paying right now.",
            "Threats to block your licence or vehicle disc.",
            "Official links end in aarto.gov.za. Links ending in .com, .co.za or .online are fake.",
            "It may even know your real registration number.",
        ],
        "what_to_do": [
            "Don’t click the link.",
            "Check for real fines yourself at aarto.gov.za using the 16-digit infringement notice number.",
            "Delete the message, and report it here so others are warned.",
        ],
        "source_name": "SAnews: RTIA warns motorists",
        "source_url": "https://www.sanews.gov.za/node/84463",
    },
    {
        "slug": "hi-mom-new-number",
        "scam_type": "family",
        "title": "“Hi Mom, this is my new number”",
        "summary": "A WhatsApp from an unknown number pretends to be your child or grandchild and asks for money.",
        "example_channel": "whatsapp",
        "example_text": "Hi Ma, it’s me. My phone fell in the water so this is my new number. I need to pay a supplier urgently, can you send R2,500? I’ll pay you back tomorrow ❤️",
        "signs": [
            "A new number you’ve never seen.",
            "They can’t talk on the phone “right now”.",
            "An urgent request for money, often to someone else’s account.",
        ],
        "what_to_do": [
            "Phone your family member on their old number.",
            "Ask something only the real person would know.",
            "Never send money until you’ve spoken to them.",
        ],
        "source_name": "SABRIC",
        "source_url": "https://www.sabric.co.za/",
    },
    {
        "slug": "courier-fee",
        "scam_type": "courier",
        "title": "Fake delivery fees",
        "summary": "An SMS says your parcel is waiting and you must pay a small fee to get it.",
        "example_channel": "sms",
        "example_text": "Parcel notice: We could not deliver your package. Pay R28.50 redelivery fee within 12 hours or it will be returned.",
        "signs": [
            "A tiny fee. They want your card details, not R28.",
            "You weren’t expecting a parcel.",
            "The link isn’t the courier’s real website.",
        ],
        "what_to_do": [
            "Don’t tap the link.",
            "Track parcels on the courier’s own website, typed in yourself.",
            "Entered card details? Phone your bank now.",
        ],
        "source_name": "SABRIC",
        "source_url": "https://www.sabric.co.za/",
    },
    {
        "slug": "whatsapp-jobs",
        "scam_type": "jobs",
        "title": "WhatsApp “easy money” jobs",
        "summary": "A stranger offers you money to like videos or rate products, then asks you to pay in.",
        "example_channel": "whatsapp",
        "example_text": "Hello! We are hiring part-time. Earn R800–R3,000 a day by liking YouTube videos. No experience needed. Reply YES to start.",
        "signs": [
            "Easy money for simple tasks.",
            "They pay you a little first to win your trust.",
            "Then you must “deposit” money to unlock bigger tasks.",
        ],
        "what_to_do": ["Don’t reply or join the group.", "Never pay to get a job.", "Block and report the number."],
        "source_name": "SABRIC",
        "source_url": "https://www.sabric.co.za/",
    },
    {
        "slug": "debicheck",
        "scam_type": "debicheck",
        "title": "DebiCheck approval tricks",
        "summary": "Someone gets you to approve a debit order you never agreed to.",
        "example_channel": "call",
        "example_text": "“Hi, I’m calling about your funeral cover upgrade. You’ll get an SMS from your bank in a moment. Please just approve it so we can confirm.”",
        "signs": [
            "You’re asked to approve a debit order you didn’t set up.",
            "The company, amount or date doesn’t match anything you signed.",
            "Someone on the phone is telling you to approve it.",
        ],
        "what_to_do": [
            "Reject the request in your banking app or SMS.",
            "Not sure? Phone your bank on the number on your card.",
            "Query any debit order you don’t recognise with your bank straight away.",
        ],
        "source_name": "Arcadia Finance",
        "source_url": "https://www.arcadiafinance.co.za/news/older-sassa-beneficiaries-targeted-by-scammers/",
    },
]


def seed_explainers():
    if one("select id from explainers limit 1"):
        return  # already seeded
    for e in EXPLAINERS:
        execute(
            """insert into explainers (slug, scam_type, title, summary, example_channel, example_text, signs, what_to_do, source_name, source_url)
               values (%(slug)s, %(scam_type)s, %(title)s, %(summary)s, %(example_channel)s, %(example_text)s, %(signs)s, %(what_to_do)s, %(source_name)s, %(source_url)s)""",
            e,
        )


if __name__ == "__main__":
    main()
