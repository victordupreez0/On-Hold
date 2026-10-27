"""Accuracy test for the scam checker, run against the real model. Costs money, so it's
not part of pytest: run it before changing the model or the prompt.

    uv run python -m scripts.eval                                   # the model in .env
    ANTHROPIC_MODEL=claude-haiku-5-5 uv run python -m scripts.eval  # another model
    uv run python -m scripts.eval scam1.png scam2.png               # plus scam screenshots

The number that matters most is "dangerous": a scam called "Looks okay" or "Scam warning".
"""

import base64
import sys
import time
from concurrent.futures import ThreadPoolExecutor

from app import ai
from app.config import get_settings

SCAM, GENUINE, WARNING, UNSURE = {"stop"}, {"safe"}, {"info"}, {"stop", "wait"}

# (acceptable verdicts, kind, text). Patterns from documented SA scams; genuine messages are everyday ones.
CASES = [
    (SCAM, "call", "A man from the Absa fraud department phoned. He said someone is stealing from my account and I must read him the OTP they just sent so he can stop it."),
    (SCAM, "message", "SASSA: Your SRD R370 payment is ON HOLD. Update your details within 24hrs to avoid cancellation: srd-sassa-pay.co.za"),
    (SCAM, "message", "SARS eFiling: You are eligible for a refund of R3,214.60. Verify your banking details within 48 hours to receive payment: sars-efiling-refund.com"),
    (SCAM, "message", "AARTO: Outstanding fine R500 for vehicle CA 123-456. Pay within 24hrs for 50% discount or your licence disc will be blocked: aarto-pay.online"),
    (SCAM, "message", "Hi Ma, it's me. My phone fell in the water so this is my new number. Can you send R2,500 for a supplier urgently? I'll pay you back tomorrow. Don't tell Dad."),
    (SCAM, "message", "Parcel notice: We could not deliver your package. Pay R28.50 redelivery fee within 12 hours or it will be returned: post-redeliver.co"),
    (SCAM, "message", "Hello! We are hiring part-time. Earn R800-R3,000 a day by liking YouTube videos. A small deposit unlocks the higher-paying tasks. Reply YES."),
    (SCAM, "call", "Someone phoned about upgrading my funeral cover. She said I'll get an SMS from my bank and I must just approve it to confirm."),
    (SCAM, "message", "Welcome to the Gold Crypto Club. Our members earn 30% every week, guaranteed. Start with only R1,000 today. Spots close tonight!"),
    (SCAM, "message", "Vodacom: Your SIM will be deactivated today. Reply with your ID number and PIN to keep your number."),
    (SCAM, "message", "Capitec: Your account has been suspended for security reasons. Restore access now at capitec-secure-za.com"),
    (SCAM, "message", "Congratulations! You won R50,000 in the Shoprite lucky draw. Pay the R250 admin fee to claim your prize. Call 072 555 0183."),
    (SCAM, "call", "A man phoned saying he's from Telkom and needs me to install an app so he can fix my internet from his side."),
    (SCAM, "message", "Hi my love, I can't wait to finally meet you. My bank card is blocked overseas. Please send R5,000 for my plane ticket and I'll pay you back when I land."),
    (SCAM, "message", "SABRIC ALERT: Fraudsters are targeting your account. Secure it now by confirming your card details at sabric-secure.co.za"),
    (SCAM, "message", "SARS SECURITY ALERT: Scammers are targeting tax refunds. To protect your refund, verify your banking details within 24 hours at sars-refund-protect.co.za."),
    (SCAM, "message", "FSCA WARNING: Your investment is at risk. Move your funds to our protected account within 24 hours. Call 081 555 0199."),
    (GENUINE, "message", "Hi Mrs Naidoo, this is Dr Patel's rooms confirming your appointment on Thursday at 10:00. Reply YES to confirm."),
    (GENUINE, "message", "Hi Gran, are you still coming for lunch on Sunday? Mom says 12:30. Love you!"),
    (GENUINE, "message", "FNB: R450.00 paid from cheq a/c..1234 @ Pick n Pay Rosebank on 27 Oct. Avail R3,210.00."),
    (GENUINE, "message", "Clicks: Your prescription is ready for collection at Clicks Rosebank. Bring your ID."),
    (GENUINE, "message", "Reminder: the Rotary meeting has moved to Thursday at 18:00 at the community hall. See you there."),
    ({"safe", "wait"}, "message", "Your Takealot OTP is 482913. Do not share this code with anyone."),
    (WARNING, "message", "WARNING FROM THE RTIA: Beware of fake AARTO traffic fine SMSes and WhatsApps offering a discount for paying today. They are scams. Never click links in fine messages."),
    (WARNING, "message", "News24: SABRIC says bank impersonation calls rose this year. Banks will never ask for your OTP or PIN, or ask you to approve a payment to 'reverse' fraud."),
    (WARNING, "message", "SASSA warns beneficiaries: SASSA never asks for money to process or speed up a grant. Anyone who asks for a fee is a scammer."),
    (WARNING, "message", "Standard Bank will never ask for your PIN, password or OTP by phone, SMS or email. If someone does, hang up and call the number on your card."),
    (UNSURE, "call", "A man phoned saying he's from the municipality. He says there's a problem with my water meter and someone will come to my house tomorrow to check it."),
]

PRICES = {"claude-sonnet-5": (2.0, 10.0), "claude-sonnet-5-5": (2.0, 10.0), "claude-haiku-5-5": (0.10, 0.50)}  # $ per 1M in/out


def main():
    model = get_settings().anthropic_model
    cases = CASES + [(SCAM, "message", path) for path in sys.argv[1:]]  # screenshots
    usage = []
    client = ai._client()
    real = client.messages.parse

    def counted(*a, **k):
        r = real(*a, **k)
        usage.append(r.usage)
        return r

    client.messages.parse = counted

    def run(case):
        ok, kind, text = case
        image = None
        if text.endswith((".png", ".jpg", ".jpeg")):
            image, text = {"base64": base64.b64encode(open(text, "rb").read()).decode()}, None
        start = time.monotonic()
        try:
            got = ai.run_check(kind, text, image)["verdict"]
        except ai.CheckFailed as e:
            got = f"failed ({e})"
        return ok, case[2], got, time.monotonic() - start

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(run, cases))

    right = dangerous = false_alarms = 0
    for ok, text, got, secs in results:
        mark = "ok " if got in ok else "MISS"
        if ok <= {"stop", "wait"} and got in ("safe", "info"):
            mark = "DANGEROUS"
            dangerous += 1
        if not ok & {"stop"} and got == "stop":
            false_alarms += 1
        right += got in ok
        print(f"{mark:<9} want {'/'.join(sorted(ok)):<9} got {got:<5} {secs:4.1f}s  {text[:70]}")

    in_price, out_price = PRICES.get(model, (0, 0))
    cost = sum(
        (u.input_tokens + 1.25 * (u.cache_creation_input_tokens or 0) + 0.1 * (u.cache_read_input_tokens or 0)) * in_price / 1e6
        + u.output_tokens * out_price / 1e6
        for u in usage
    )
    print(f"\n{model}: {right}/{len(results)} right, {dangerous} dangerous, {false_alarms} false alarms, "
          f"avg {sum(r[3] for r in results) / len(results):.1f}s, ${cost:.4f} total (${cost / len(results):.5f} per check)")


if __name__ == "__main__":
    main()
