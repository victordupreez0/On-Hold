"""Realistic demo data: about 30 people across South Africa, their checks,
follow-up chats, family links, alerts and ~150 community reports. Run with:

    uv run python -m scripts.seed

Rebuilds on every run. Everything owned by an @onhold.test account is wiped
and re-created with dates relative to now, so the map, "going around near
you" and the admin trend never go stale before a demo. Real accounts (any
other email domain) are never touched.

Safe by construction: every person is fictional, every email is on the
reserved .test domain (it can't reach a real inbox), demo phone numbers use
the unallocated +27 00 prefix (they can't ring a real person), sender numbers
are masked, and there are no live links. The scams themselves are real
patterns, documented by SABRIC, SASSA, SARS, the RTIA and the FSCA.

Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (admin API, creates the auth
users) and DATABASE_URL (everything else) in backend/.env. Set ADMIN_PASSWORD
there too: the admin demo account gets it instead of the published demo
password, so a public deployment can't be administered by anyone who reads this.
"""

import random
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.db import cursor, execute, query

DEMO_PASSWORD = "onhold-demo"
rng = random.Random(2810)  # same people and stories every run; only the dates move
NOW = datetime.now(UTC)


class SeedSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    supabase_url: str
    supabase_service_role_key: str
    # The admin demo account must not share the published demo password once the API is public.
    admin_password: str | None = None


def ago(hours: float) -> datetime:
    return NOW - timedelta(hours=hours)


def recent(max_hours: float) -> float:
    """Hours ago, somewhere in the person's time on the app. Recent days still come out
    busiest, because more people have joined by then."""
    return rng.uniform(0.5, max_hours)


# ---------- People ----------
# (name, email, role, suburb, joined days ago, simple mode). The first three are the
# sign-in demo accounts; everyone else is fictional background activity.

DEMO = [
    ("Marie", "marie@onhold.test", "protected", "Bellville", 40, False),
    ("Pieter", "pieter@onhold.test", "guardian", "Durbanville", 40, False),
    ("Lerato", "admin@onhold.test", "admin", "Sandton", 45, False),
]
PEOPLE = DEMO + [
    ("Thandiwe Mokoena", "thandiwe.mokoena@onhold.test", "protected", "Soweto", 38, True),
    ("Johannes van der Merwe", "johannes.vdmerwe@onhold.test", "protected", "Centurion", 35, False),
    ("Fatima Ebrahim", "fatima.ebrahim@onhold.test", "protected", "Chatsworth", 33, False),
    ("Nomsa Dlamini", "nomsa.dlamini@onhold.test", "protected", "Pinetown", 31, True),
    ("Gert Botha", "gert.botha@onhold.test", "protected", "Durbanville", 30, False),
    ("Lindiwe Khumalo", "lindiwe.khumalo@onhold.test", "protected", "Mamelodi", 28, False),
    ("Sipho Ndlovu", "sipho.ndlovu@onhold.test", "protected", "Tembisa", 27, False),
    ("Elsie Jacobs", "elsie.jacobs@onhold.test", "protected", "Mitchells Plain", 26, True),
    ("Pravin Naidoo", "pravin.naidoo@onhold.test", "protected", "Chatsworth", 25, False),
    ("Margaret Smith", "margaret.smith@onhold.test", "protected", "Sea Point", 24, False),
    ("Busisiwe Zulu", "busisiwe.zulu@onhold.test", "protected", "Pietermaritzburg", 22, False),
    ("Koos Pretorius", "koos.pretorius@onhold.test", "protected", "Bloemfontein", 21, False),
    ("Nokuthula Mthembu", "nokuthula.mthembu@onhold.test", "protected", "Khayelitsha", 19, False),
    ("Ahmed Patel", "ahmed.patel@onhold.test", "protected", "Benoni", 18, False),
    ("Rina Swanepoel", "rina.swanepoel@onhold.test", "protected", "Polokwane", 16, True),
    ("Themba Sithole", "themba.sithole@onhold.test", "protected", "Alexandra", 14, False),
    ("Dorothy Mahlangu", "dorothy.mahlangu@onhold.test", "protected", "Mbombela", 12, False),
    ("Anna Fourie", "anna.fourie@onhold.test", "protected", "Stellenbosch", 9, False),
    ("Mpho Molefe", "mpho.molefe@onhold.test", "protected", "Rustenburg", 2, False),
    ("Zanele Ntuli", "zanele.ntuli@onhold.test", "protected", "East London", 1, False),
    ("Kagiso Mokoena", "kagiso.mokoena@onhold.test", "guardian", "Randburg", 37, False),
    ("Annelie van der Merwe", "annelie.vdmerwe@onhold.test", "guardian", "Hatfield", 34, False),
    ("Yusuf Ebrahim", "yusuf.ebrahim@onhold.test", "guardian", "Bellville", 32, False),
    ("Ayanda Dlamini", "ayanda.dlamini@onhold.test", "guardian", "Umhlanga", 30, False),
    ("Priya Naidoo", "priya.naidoo@onhold.test", "guardian", "Umhlanga", 24, False),
    ("Lebo Khumalo", "lebo.khumalo@onhold.test", "guardian", "Midrand", 27, False),
    ("Chantal Jacobs", "chantal.jacobs@onhold.test", "guardian", "Bellville", 25, False),
    ("Riaan Botha", "riaan.botha@onhold.test", "guardian", "Roodepoort", 3, False),
]
DEMO_PHONES = {"marie@onhold.test": "+27 00 555 0101", "pieter@onhold.test": "+27 00 555 0102"}

# (guardian email, protected email, share calls, share verdicts) -- active family links.
LINKS = [
    ("pieter@onhold.test", "marie@onhold.test", True, True),
    ("kagiso.mokoena@onhold.test", "thandiwe.mokoena@onhold.test", True, True),
    ("annelie.vdmerwe@onhold.test", "johannes.vdmerwe@onhold.test", True, True),
    ("yusuf.ebrahim@onhold.test", "fatima.ebrahim@onhold.test", False, True),
    ("ayanda.dlamini@onhold.test", "nomsa.dlamini@onhold.test", True, True),
    ("priya.naidoo@onhold.test", "pravin.naidoo@onhold.test", True, False),
    ("lebo.khumalo@onhold.test", "lindiwe.khumalo@onhold.test", True, True),
    ("chantal.jacobs@onhold.test", "elsie.jacobs@onhold.test", True, True),
]
# (guardian email, invited name, code) -- invites not accepted yet.
PENDING_INVITES = [
    ("pieter@onhold.test", "Johan", "JOHAN7"),
    ("kagiso.mokoena@onhold.test", "Gogo Mavis", "MAVIS4"),
    ("riaan.botha@onhold.test", "Oupa Hennie", "HENNI3"),
]

# Real areas, so the map spreads across the country (the original 16 are in the init migration).
EXTRA_SUBURBS = [
    ("Khayelitsha", "Cape Town", -34.0396, 18.6776),
    ("Stellenbosch", "Cape Winelands", -33.9321, 18.8602),
    ("Tembisa", "Ekurhuleni", -25.9966, 28.2268),
    ("Alexandra", "Johannesburg", -26.1028, 28.0937),
    ("Midrand", "Johannesburg", -25.9992, 28.1263),
    ("Polokwane", "Polokwane", -23.9045, 29.4689),
    ("Bloemfontein", "Mangaung", -29.0852, 26.1596),
    ("Pietermaritzburg", "Msunduzi", -29.6006, 30.3794),
    ("East London", "Buffalo City", -33.0153, 27.9116),
    ("Mbombela", "Mbombela", -25.4658, 30.9853),
    ("Rustenburg", "Rustenburg", -25.6676, 27.2421),
]

# ---------- Scams ----------
# Per type: how it arrives, what people report, and what a check says about it.

SCAMS = {
    "bank": {
        "weight": 20,
        "channels": ["call", "call", "sms", "whatsapp"],
        "reports": [
            "Man phoned saying he was from my bank’s fraud department and that R4,800 was about to go off my account. He asked me to read him the OTP they’d just sent.",
            "SMS said my card was blocked and gave a number to phone. The person who answered wanted my card number and PIN to “unblock” it.",
            "Caller knew my name and the last four digits of my card, then asked me to approve a notification in my banking app to “stop” a payment.",
            "WhatsApp from a “bank consultant” saying my profile must be updated before Friday or my account will be closed.",
            "SMS about a suspicious login with a link to “secure” my account. The link wasn’t my bank’s website.",
            "Woman said she was from the bank and that my money had to be moved to a “safe account” to protect it. She gave me account details to pay into.",
        ],
        "stop": ["This is a fake bank fraud call", "Someone is pretending to be your bank", "This is a fake bank message"],
        "reasons": [
            "Banks never ask for your OTP, PIN or password",
            "You’re being rushed to act right now",
            "Real banks don’t move your money to a “safe account”",
            "The link doesn’t go to your bank’s real website",
        ],
        "next": ["Hang up, or don’t reply", "Phone your bank on the number on the back of your card", "Shared a code? Call your bank right away"],
        "say": "I don’t do banking over the phone. I’ll phone my bank myself on the number on my card. Goodbye.",
    },
    "sassa": {
        "weight": 16,
        "channels": ["sms", "sms", "whatsapp", "call"],
        "reports": [
            "SMS said my SRD payment is on hold and I must update my details on a link within 24 hours.",
            "WhatsApp offering to fast-track my grant if I pay a R100 “processing fee”.",
            "Message said my SASSA card is being replaced and I must send my ID number and card PIN to keep getting paid.",
            "Caller said he was from SASSA and that my grant was approved for an increase, but I first had to pay R250.",
            "Caller said my SASSA card had been flagged for fraud and asked me to confirm my PIN to keep it open.",
        ],
        "stop": ["This is a fake SASSA message", "SASSA never charges a fee like this"],
        "reasons": [
            "SASSA never charges to apply or to release a payment",
            "The link isn’t srd.sassa.gov.za",
            "They want your card PIN or ID number",
        ],
        "next": ["Don’t tap the link or reply", "Phone SASSA free on 0800 60 10 11", "Never share your card PIN with anyone"],
        "say": "SASSA doesn’t phone me for money. I’ll check with SASSA myself. Goodbye.",
    },
    "aarto": {
        "weight": 14,
        "channels": ["sms", "sms", "whatsapp"],
        "reports": [
            "SMS with my real registration number offering 50% off a traffic fine if I pay today.",
            "WhatsApp saying my licence disc will be blocked unless I pay R250 now.",
            "SMS about an “outstanding AARTO infringement” with a short link. The link didn’t end in aarto.gov.za.",
            "Message said a warrant had been issued for an unpaid speeding fine and gave a link to pay it.",
        ],
        "stop": ["This looks like a fake traffic fine", "This isn’t a real AARTO fine"],
        "reasons": [
            "Real AARTO links end in aarto.gov.za",
            "A big discount for paying right now is a trick",
            "Threats to block your licence disc are a pressure tactic",
        ],
        "next": ["Don’t click the link", "Check for real fines yourself at aarto.gov.za", "Report it so others are warned"],
    },
    "family": {
        "weight": 14,
        "channels": ["whatsapp", "whatsapp", "sms", "call"],
        "reports": [
            "“Hi Ma, this is my new number” on WhatsApp, then asked for R2,500 urgently for a supplier.",
            "Someone pretending to be my grandson phoned crying, said he was in trouble with the police and needed bail money.",
            "WhatsApp from an unknown number with my daughter’s profile picture, asking me to pay an invoice for her.",
            "Message saying “Dad, my phone broke, please send R1,800 to my friend’s account, I’ll explain later”.",
            "A voice note that sounded like my son asking for money. When I phoned his normal number he knew nothing about it.",
        ],
        "stop": ["This looks like a “new number” family scam", "Someone may be pretending to be your family"],
        "reasons": [
            "It’s a new number you don’t know",
            "An urgent request for money to someone else’s account",
            "They avoid talking on the phone",
        ],
        "next": ["Phone your family member on their old number", "Ask something only they would know", "Don’t send money until you’ve spoken to them"],
        "say": "I’ll phone you back on your usual number. Goodbye.",
    },
    "courier": {
        "weight": 12,
        "channels": ["sms", "sms", "whatsapp", "email"],
        "reports": [
            "SMS about a parcel needing a R28.50 redelivery fee. I wasn’t expecting anything.",
            "Message from a “courier” saying customs fees of R145 must be paid before my package can be released.",
            "SMS said my parcel address was incomplete and to update it on a link, which then asked for my card details.",
            "WhatsApp from a courier company saying delivery failed and asking for my ID number to rebook it.",
        ],
        "stop": ["This is a fake delivery fee", "This parcel message is a scam"],
        "reasons": [
            "A tiny fee is a trick to get your card details",
            "You weren’t expecting a parcel",
            "The link isn’t the courier’s real website",
        ],
        "next": ["Don’t tap the link", "Track parcels on the courier’s own website, typed in yourself", "Entered card details? Phone your bank now"],
    },
    "jobs": {
        "weight": 8,
        "channels": ["whatsapp", "whatsapp", "sms"],
        "reports": [
            "Offered R800 a day to like YouTube videos, then asked for a R500 deposit to unlock “VIP tasks”.",
            "WhatsApp job offer for remote work rating hotels. They paid me R150 first, then wanted me to deposit R2,000.",
            "Job advert for a cleaning post at a hospital. They asked for R350 for a “uniform and medical check” before the interview.",
            "Telegram group promising daily commission for product reviews. I had to top up my “account” before I could withdraw.",
        ],
        "stop": ["This is a fake job offer", "Real jobs don’t ask you to pay"],
        "reasons": ["Easy money for simple tasks", "You have to pay in before you can earn", "They contacted you out of the blue"],
        "next": ["Don’t pay anything", "Block and report the number", "Never share your banking details for a job you haven’t started"],
    },
    "debicheck": {
        "weight": 8,
        "channels": ["call", "call", "sms"],
        "reports": [
            "Caller about “funeral cover” told me to approve the bank SMS that was about to come through.",
            "Got an SMS asking me to approve a DebiCheck of R399 a month for a company I’ve never heard of.",
            "Man said my insurance premium was going down and I just had to approve the new debit order on my phone.",
            "Someone phoned to “cancel” a policy I never had and said I must accept the bank’s request to stop it.",
        ],
        "stop": ["Don’t approve this debit order", "This is a DebiCheck trick"],
        "reasons": [
            "You’re asked to approve a debit order you didn’t set up",
            "Someone on the phone is telling you to approve it",
            "The company or amount doesn’t match anything you signed",
        ],
        "next": ["Reject the request in your banking app", "Phone your bank on the number on your card", "Query any debit order you don’t recognise"],
        "say": "I don’t approve anything over the phone. Send it to me in writing. Goodbye.",
    },
    "sars": {
        "weight": 6,
        "channels": ["email", "email", "sms", "call"],
        "reports": [
            "Email from “SARS eFiling” saying I have a refund of R3,214 waiting, with a link to confirm my bank details.",
            "SMS saying I owe SARS penalties and will be arrested unless I pay today.",
            "Caller said he was a SARS official and that my tax number was suspended. He wanted my eFiling password.",
            "Email with an attached “tax certificate” that asked me to log in to open it.",
        ],
        "stop": ["This is a fake SARS refund", "This isn’t really SARS"],
        "reasons": [
            "SARS won’t ask for your banking or eFiling details by email",
            "Real refunds go to the account already on your SARS profile",
            "Threats of arrest are a pressure tactic",
        ],
        "next": ["Don’t open the link or attachment", "Log in to eFiling yourself at sars.gov.za", "Forward it to phishing@sars.gov.za"],
        "say": "I’ll deal with SARS directly through eFiling. Goodbye.",
    },
    "investment": {
        "weight": 5,
        "channels": ["whatsapp", "whatsapp", "email"],
        "reports": [
            "WhatsApp group promising to double my money with crypto trading in a week.",
            "Facebook advert using a famous South African’s face, saying he made millions on a new trading platform.",
            "Man I met online kept talking about his forex profits and wanted me to open an account on his “platform”.",
            "Invitation to an investment club paying 30% a month. I would only get paid if I recruited others.",
        ],
        "stop": ["This looks like an investment scam", "Promises like this are a warning sign"],
        "reasons": ["Guaranteed big returns, fast", "Pressure to invest before it’s “too late”", "They aren’t registered with the FSCA"],
        "next": ["Don’t send any money", "Check if they’re registered at fsca.co.za", "Talk to someone you trust before investing"],
    },
    "other": {
        "weight": 4,
        "channels": ["sms", "call", "whatsapp"],
        "reports": [
            "Message said I won a supermarket voucher and must pay R50 delivery to claim it.",
            "Caller from “the municipality” said my prepaid meter would be blocked unless I bought a token through him.",
            "SMS said my SIM card would be suspended for RICA unless I sent my ID number.",
            "Buyer on Marketplace sent a fake proof of payment and asked me to refund the “overpayment”.",
        ],
        "stop": ["This looks like a scam", "Be very careful with this one"],
        "reasons": ["They want money or personal details up front", "The message creates panic", "It came out of the blue"],
        "next": ["Don’t reply or pay", "Contact the company yourself, using details you trust", "Block the sender"],
    },
}
SCAM_LABEL = {
    "bank": "bank", "sassa": "SASSA", "aarto": "traffic fine", "family": "family", "courier": "delivery",
    "jobs": "job", "debicheck": "debit order", "sars": "SARS", "investment": "investment", "other": "",
}

SAFE_CHECKS = [
    ("This looks like a normal reminder", ["It doesn’t ask for money, codes or personal details", "There’s no link and no pressure to act fast"]),
    ("This looks okay", ["It’s from a contact you already know", "Nothing in it asks you to pay or click"]),
    ("This seems like a genuine appointment message", ["It only confirms a time you booked", "It doesn’t ask you to do anything risky"]),
]
SAFE_NEXT = ["You can reply as normal", "If it changes and asks for money or a code, check it again"]

WAIT_REASONS = ["Some signs of a scam, but we can’t be sure", "It asks you to act quickly", "We can’t confirm who really sent it"]
WAIT_NEXT = ["Don’t act on it yet", "Check with the organisation yourself, on a number you trust", "Ask someone you trust to look at it"]

# Follow-up questions people ask about a verdict, with On Hold's answers.
CHATS = {
    "bank": [
        ("What if he phones again?", "Don’t answer, or hang up as soon as he says he’s from the bank. Your bank will never mind you phoning them back on the number on your card. You can also block the number."),
        ("I already gave him the code. What now?", "Phone your bank right now on the number on the back of your card and tell them you shared an OTP. They can stop payments and block the card. Then change your banking app PIN."),
    ],
    "family": [("How do I know if it’s really my son?", "Phone him on the number you already have saved for him, or ask something only he would know, like the name of your first dog. The real person won’t mind.")],
    "sassa": [("Where can I check my real SRD status?", "Only on srd.sassa.gov.za, typed in yourself, or by phoning SASSA free on 0800 60 10 11. SASSA never charges to check or release a payment.")],
    "aarto": [("How do I check if I really have a fine?", "Go to aarto.gov.za yourself and search with your ID number or the infringement notice number. Don’t use the link in the message.")],
    "courier": [("I did put in my card number. Is it too late?", "No. Phone your bank now on the number on your card and ask them to block it. Then watch your statement for payments you don’t recognise.")],
    "debicheck": [("I pressed accept by mistake. Can I undo it?", "Yes. Phone your bank and say you approved a DebiCheck mandate by mistake. They can cancel it, and you can dispute any debit that already went off.")],
    "jobs": [("They already paid me R150, so isn’t it real?", "That small payment is how the trick works: it builds trust so you’ll pay in more. A real job never asks you to deposit money.")],
    "investment": [("How can I check if a company is real?", "Search for them on the FSCA’s website, fsca.co.za. If they aren’t registered to give financial advice, don’t give them money.")],
}

# Reports a moderator turned down, with the reason the reporter sees.
REJECTED = [
    ("This number is my ex, he is a scammer!! Don’t trust him.", "A personal dispute, not a scam"),
    ("My neighbour owes me R600 and won’t pay me back.", "A personal dispute, not a scam"),
    ("The man at number 14 in my road is the scammer, his name is on his gate.", "Contains personal information"),
    ("Got a strange call, not sure what it was about.", "Not enough detail"),
    ("Fake SASSA SMS again, same as everyone else is reporting.", "Already reported"),
]
# Borderline ones left in the queue for a moderator to decide during a demo.
PENDING_EXTRA = [
    ("whatsapp", "other", "This number is my ex, he is a scammer!!"),
    ("call", "bank", "Man from “Capitec fraud” asked me to read out the code they sent."),
]


def masked_sender(channel: str) -> str | None:
    if rng.random() < 0.45:
        return None
    if channel == "email":
        return rng.choice(["refunds@*****.com", "noreply@****-efiling.co", "support@*******.net"])
    return f"0{rng.choice('678')}{rng.randint(0, 9)} *** **{rng.randint(10, 99)}"


def channel_of(description: str, scam_type: str) -> str:
    """The channel a report's own words describe, so an "SMS about..." is never filed as a phone call."""
    d = description.lower()
    found = [(d.find(w), channel) for words, channel in [
        (("whatsapp", "voice note", "telegram"), "whatsapp"), (("email",), "email"), (("sms", "message"), "sms"),
        (("phoned", "caller", "called", "calling", "phone", "man said", "woman said"), "call"),
    ] for w in words if w in d]
    return min(found)[1] if found else SCAMS[scam_type]["channels"][0]  # the first one mentioned is how it arrived


def describe(scam_type: str, channel: str | None = None) -> tuple[str, str]:
    """A report description and its channel; matches `channel` when one is given and the type has a story for it."""
    stories = SCAMS[scam_type]["reports"]
    fitting = [r for r in stories if channel is None or channel_of(r, scam_type) == channel] or stories
    text = rng.choice(fitting)
    return text, channel_of(text, scam_type)


def pick_type() -> str:
    types = list(SCAMS)
    return rng.choices(types, weights=[SCAMS[t]["weight"] for t in types])[0]


# ---------- Build ----------


def get_or_create_users(client: httpx.Client, admin_password: str | None) -> dict[str, str]:
    existing = {}
    page = 1
    while True:
        users = client.get("/auth/v1/admin/users", params={"page": page, "per_page": 1000}).json().get("users", [])
        existing.update({u["email"]: u["id"] for u in users})
        if len(users) < 1000:
            break
        page += 1
    ids = {}
    for name, email, role, *_ in PEOPLE:
        password = admin_password if role == "admin" and admin_password else DEMO_PASSWORD
        if email not in existing:
            res = client.post(
                "/auth/v1/admin/users",
                json={"email": email, "password": password, "email_confirm": True, "user_metadata": {"name": name}},
            )
            res.raise_for_status()
            existing[email] = res.json()["id"]
        elif role == "admin" and admin_password:
            client.put(f"/auth/v1/admin/users/{existing[email]}", json={"password": admin_password}).raise_for_status()
        ids[email] = existing[email]
    return ids


def many(sql: str, rows: list[dict]):
    if rows:
        with cursor() as cur:
            cur.executemany(sql, rows)


def main():
    settings = SeedSettings()
    client = httpx.Client(
        base_url=settings.supabase_url,
        headers={"apikey": settings.supabase_service_role_key, "Authorization": f"Bearer {settings.supabase_service_role_key}"},
        timeout=30,
    )

    many(
        "insert into suburbs (name, city, lat, lng) values (%(n)s, %(c)s, %(lat)s, %(lng)s) on conflict (name) do nothing",
        [{"n": n, "c": c, "lat": lat, "lng": lng} for n, c, lat, lng in EXTRA_SUBURBS],
    )
    ids = get_or_create_users(client, settings.admin_password)
    if not settings.admin_password:
        print("Note: ADMIN_PASSWORD isn't set, so admin@onhold.test keeps the public demo password. Set it before deploying.")

    # Wipe everything the seeded accounts own, then rebuild it relative to now.
    seeded = [r["id"] for r in query("select id from profiles where email like '%%@onhold.test'")]
    for sql in [
        "delete from checks where user_id = any(%(ids)s)",
        "delete from reports where reporter_id = any(%(ids)s)",
        "delete from guardian_links where guardian_id = any(%(ids)s) or protected_id = any(%(ids)s)",
        "delete from ai_calls where user_id = any(%(ids)s)",
    ]:
        execute(sql, {"ids": seeded})

    joined = {}  # email -> hours ago they signed up
    people = {}
    for name, email, role, suburb, days, simple in PEOPLE:
        joined[email] = days * 24 - rng.uniform(0, 20)
        people[email] = {"id": ids[email], "name": name, "role": role, "suburb": suburb}
    many(
        """update profiles set name = %(name)s, role = %(role)s, suburb = %(suburb)s, phone = %(phone)s,
               simple_mode = %(simple)s, created_at = %(joined)s
           where id = %(id)s""",
        [
            {"id": ids[e], "name": n, "role": r, "suburb": s, "phone": DEMO_PHONES.get(e), "simple": simple, "joined": ago(joined[e])}
            for n, e, r, s, _, simple in PEOPLE
        ],
    )

    checks, messages, ai_calls, alerts, reports, links = [], [], [], [], [], []
    last_seen = {e: joined[e] for e in people}  # hours ago

    def touch(email: str, hours: float):
        last_seen[email] = min(last_seen[email], hours)

    # Family links come first so later Stop verdicts can alert the right guardians.
    link_of = {}  # protected email -> [(link id, share calls, share verdicts, linked hours ago)]
    for g, p, calls, verdicts in LINKS:
        is_marie = p == "marie@onhold.test"  # fixed, so Marie's recent Stop always reaches Pieter
        linked = 9 * 24 if is_marie else rng.uniform(1, min(joined[g], joined[p]) - 1)
        link_id = uuid.uuid4()
        code = "MARIE1" if is_marie else uuid.uuid4().hex[:6].upper()
        links.append({"id": link_id, "g": people[g]["id"], "p": people[p]["id"], "pname": people[p]["name"].split()[0],
                      "code": code, "status": "active", "calls": calls, "verdicts": verdicts, "t": ago(linked)})
        alerts.append({"link": link_id, "name": people[p]["name"].split()[0], "type": "invite_accepted", "check": None,
                       "detail": "Accepted your invite", "seen": True, "t": ago(linked)})
        link_of.setdefault(p, []).append((link_id, calls, verdicts, linked))
        touch(g, linked)
        touch(p, linked)
    for g, invited, code in PENDING_INVITES:
        sent = rng.uniform(2, min(joined[g], 6 * 24))  # invites expire after 7 days
        links.append({"id": uuid.uuid4(), "g": people[g]["id"], "p": None, "pname": invited, "code": code,
                      "status": "pending", "calls": True, "verdicts": True, "t": ago(sent)})
        touch(g, sent)

    def add_check(email: str, hours: float, scam_type: str | None = None, verdict: str | None = None, headline: str | None = None):
        verdict = verdict or rng.choices(["stop", "wait", "safe"], weights=[45, 30, 25])[0]
        scam_type = None if verdict == "safe" else (scam_type or pick_type())
        if verdict == "safe":
            channel = rng.choice(["sms", "whatsapp", "email"])
            headline_, reasons = rng.choice(SAFE_CHECKS)
            next_steps, confidence = SAFE_NEXT, rng.uniform(0.75, 0.9)
        else:
            s = SCAMS[scam_type]
            channel = rng.choice(s["channels"])
            if verdict == "stop":
                headline_, confidence = rng.choice(s["stop"]), rng.uniform(0.85, 0.97)
                reasons = rng.sample(s["reasons"], k=min(len(s["reasons"]), rng.choice([2, 3])))
                next_steps = s["next"]
            else:
                label = SCAM_LABEL[scam_type]
                headline_ = f"Be careful, this could be a {label} scam" if label else "Be careful with this one"
                confidence, reasons, next_steps = rng.uniform(0.5, 0.7), [s["reasons"][0], *rng.sample(WAIT_REASONS, 1)], WAIT_NEXT
        kind = "call" if channel == "call" else "message"
        say = SCAMS[scam_type].get("say") if kind == "call" and verdict != "safe" else None
        check_id = uuid.uuid4()
        checks.append({"id": check_id, "u": people[email]["id"], "kind": kind, "verdict": verdict, "conf": round(confidence, 2),
                       "type": scam_type, "headline": headline or headline_, "reasons": reasons, "next": next_steps, "say": say, "t": ago(hours)})
        ai_calls.append({"u": people[email]["id"], "t": ago(hours)})
        touch(email, hours)

        if scam_type in CHATS and rng.random() < 0.2:
            for i, (q, a) in enumerate(CHATS[scam_type][: rng.randint(1, 2)]):
                at = max(hours - 0.05 * (i + 1), 0.01)
                messages.extend([
                    {"c": check_id, "role": "user", "content": q, "t": ago(at)},
                    {"c": check_id, "role": "assistant", "content": a, "t": ago(at) + timedelta(seconds=4)},
                ])
                ai_calls.append({"u": people[email]["id"], "t": ago(at)})

        # Consent-based alerts, exactly as POST /checks sends them.
        for link_id, share_calls, share_verdicts, linked in link_of.get(email, []):
            if verdict == "stop" and linked > hours and (share_calls if kind == "call" else share_verdicts):
                detail = f"Got a Stop {'during a call' if kind == 'call' else 'on a message'}: {headline or headline_}"
                alerts.append({"link": link_id, "name": people[email]["name"].split()[0], "type": "stop_verdict",
                               "check": check_id, "detail": detail, "seen": hours > 20, "t": ago(hours)})
        return check_id, channel, scam_type, verdict

    def add_report(email: str, hours: float, channel: str, scam_type: str, description: str, check_id=None,
                   status: str | None = None, reason: str | None = None):
        suburb = people[email]["suburb"] if rng.random() < 0.85 else rng.choice([s[0] for s in EXTRA_SUBURBS])
        if status is None:
            status = "pending" if hours < 30 and rng.random() < 0.6 else "approved"  # a moderator clears the queue daily
        moderated = None if status == "pending" else ago(hours - rng.uniform(0, min(hours, 18)))
        reports.append({"r": people[email]["id"], "c": check_id, "ch": channel, "type": scam_type, "d": description,
                        "sender": masked_sender(channel), "sub": suburb, "st": status, "reason": reason,
                        "mod": people["admin@onhold.test"]["id"] if moderated else None, "modt": moderated, "t": ago(hours)})
        touch(email, hours)

    # The demo accounts get a fixed, recent story so a live demo always opens on something.
    marie_fine, *_ = add_check("marie@onhold.test", 3, "aarto", "stop", "This looks like a fake traffic fine")
    add_check("marie@onhold.test", 30, "bank", "stop", "This is a fake bank fraud call")
    add_check("marie@onhold.test", 26 * 24, verdict="safe")
    add_report("marie@onhold.test", 2, "sms", "aarto", "SMS with my registration number offering 50% off if I paid today.", marie_fine, "approved")

    reporters = [e for e in people if people[e]["role"] != "admin"]
    for email in reporters:
        if email in ("marie@onhold.test",):
            continue
        is_guardian = people[email]["role"] == "guardian"
        tenure = min(1, joined[email] / (14 * 24))  # someone who joined yesterday hasn't done a fortnight's worth yet
        for _ in range(round((rng.randint(0, 2) if is_guardian else rng.randint(2, 7)) * tenure) or 1):
            hours = recent(joined[email] - 1)
            check_id, channel, scam_type, verdict = add_check(email, hours)
            if verdict != "safe" and rng.random() < 0.35:  # some people go on to warn their area
                text, told = describe(scam_type, channel)
                add_report(email, max(hours - rng.uniform(0.1, 2), 0.1), told, scam_type, text, check_id)
        for _ in range(round((rng.randint(1, 3) if is_guardian else rng.randint(2, 6)) * tenure)):
            scam_type = pick_type()
            text, channel = describe(scam_type)
            add_report(email, recent(joined[email] - 1), channel, scam_type, text)

    for description, reason in REJECTED:
        email = rng.choice(reporters)
        add_report(email, rng.uniform(4 * 24, min(joined[email], 30 * 24)), "whatsapp", "other", description, status="rejected", reason=reason)
    for (channel, scam_type, description), email in zip(PENDING_EXTRA, ["gert.botha@onhold.test", "themba.sithole@onhold.test"]):
        add_report(email, rng.uniform(1, 9), channel, scam_type, description, status="pending")

    # People who've used it recently, beyond what they created, plus the admin moderating.
    for email in people:
        if rng.random() < 0.5:
            touch(email, rng.uniform(0.2, 48))
    touch("admin@onhold.test", 0.5)

    many(
        """insert into guardian_links (id, guardian_id, protected_id, protected_name, code, status, share_calls, share_verdicts, created_at)
           values (%(id)s, %(g)s, %(p)s, %(pname)s, %(code)s, %(status)s, %(calls)s, %(verdicts)s, %(t)s)""",
        links,
    )
    many(
        """insert into checks (id, user_id, kind, verdict, confidence, scam_type, headline, reasons, next_steps, say_this, created_at)
           values (%(id)s, %(u)s, %(kind)s, %(verdict)s, %(conf)s, %(type)s, %(headline)s, %(reasons)s, %(next)s, %(say)s, %(t)s)""",
        checks,
    )
    many("insert into check_messages (check_id, role, content, created_at) values (%(c)s, %(role)s, %(content)s, %(t)s)", messages)
    many("insert into ai_calls (user_id, created_at) values (%(u)s, %(t)s)", ai_calls)
    many(
        """insert into alerts (link_id, person_name, type, check_id, detail, seen, created_at)
           values (%(link)s, %(name)s, %(type)s, %(check)s, %(detail)s, %(seen)s, %(t)s)""",
        alerts,
    )
    many(
        """insert into reports (reporter_id, check_id, channel, scam_type, description, sender, suburb, status, reject_reason, moderated_by, moderated_at, created_at)
           values (%(r)s, %(c)s, %(ch)s, %(type)s, %(d)s, %(sender)s, %(sub)s, %(st)s, %(reason)s, %(mod)s, %(modt)s, %(t)s)""",
        reports,
    )
    many("update profiles set last_seen_at = %(t)s where id = %(id)s", [{"id": people[e]["id"], "t": ago(h)} for e, h in last_seen.items()])

    seed_explainers()
    print(f"Seeded {len(people)} people, {len(checks)} checks, {len(messages)} chat messages, {len(reports)} reports, "
          f"{len(links)} family links, {len(alerts)} alerts.")


# The Learn tab's content, DB-backed and admin-editable. Only missing guides are
# added, so an admin's edits survive a reseed.
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
    {
        "slug": "investment-promises",
        "scam_type": "investment",
        "title": "“Double your money” investments",
        "summary": "Someone promises big, fast returns from crypto, forex or an investment club, then asks you to pay in.",
        "example_channel": "whatsapp",
        "example_text": "Welcome to the Gold Crypto Club 💰 Our members earn 30% every week. Start with only R1,000 today. Spots close tonight!",
        "signs": [
            "Guaranteed returns, especially big ones, fast.",
            "Pressure to join before “spots close”.",
            "You only get paid if you recruit other people.",
            "They aren’t on the FSCA’s list of registered providers.",
        ],
        "what_to_do": [
            "Don’t send money.",
            "Check the company at fsca.co.za before you invest anything.",
            "Already paid? Report it to the FSCA and phone your bank.",
        ],
        "source_name": "FSCA",
        "source_url": "https://www.fsca.co.za/",
    },
]


def seed_explainers():
    many(
        """insert into explainers (slug, scam_type, title, summary, example_channel, example_text, signs, what_to_do, source_name, source_url)
           values (%(slug)s, %(scam_type)s, %(title)s, %(summary)s, %(example_channel)s, %(example_text)s, %(signs)s, %(what_to_do)s, %(source_name)s, %(source_url)s)
           on conflict (slug) do nothing""",
        EXPLAINERS,
    )


if __name__ == "__main__":
    main()
