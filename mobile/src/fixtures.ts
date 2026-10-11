// Mock data for the frontend phase. Phase 2 moves this into the Supabase seed.
import type {
  AlertItem,
  Channel,
  CheckResult,
  Explainer,
  GuardianLink,
  Report,
  ScamType,
  Suburb,
  User,
} from './types';

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const SCAM_LABELS: Record<ScamType, string> = {
  bank: 'Fake bank call',
  sassa: 'SASSA grant scam',
  sars: 'Fake SARS refund',
  aarto: 'Fake traffic fine',
  family: '"Hi Mom, new number"',
  courier: 'Fake delivery fee',
  jobs: 'WhatsApp job scam',
  debicheck: 'DebiCheck trick',
  investment: 'Investment scam',
  other: 'Something else',
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Phone call',
};

export const SUBURBS: Suburb[] = [
  { name: 'Soweto', city: 'Johannesburg', lat: -26.2485, lng: 27.854 },
  { name: 'Sandton', city: 'Johannesburg', lat: -26.1076, lng: 28.0567 },
  { name: 'Randburg', city: 'Johannesburg', lat: -26.0936, lng: 28.0064 },
  { name: 'Roodepoort', city: 'Johannesburg', lat: -26.1625, lng: 27.8725 },
  { name: 'Benoni', city: 'Ekurhuleni', lat: -26.1885, lng: 28.3208 },
  { name: 'Centurion', city: 'Pretoria', lat: -25.8603, lng: 28.1894 },
  { name: 'Hatfield', city: 'Pretoria', lat: -25.7487, lng: 28.238 },
  { name: 'Mamelodi', city: 'Pretoria', lat: -25.711, lng: 28.395 },
  { name: 'Bellville', city: 'Cape Town', lat: -33.9022, lng: 18.629 },
  { name: 'Mitchells Plain', city: 'Cape Town', lat: -34.0446, lng: 18.6181 },
  { name: 'Sea Point', city: 'Cape Town', lat: -33.9156, lng: 18.388 },
  { name: 'Durbanville', city: 'Cape Town', lat: -33.8323, lng: 18.6464 },
  { name: 'Umhlanga', city: 'Durban', lat: -29.7256, lng: 31.0849 },
  { name: 'Pinetown', city: 'Durban', lat: -29.817, lng: 30.857 },
  { name: 'Chatsworth', city: 'Durban', lat: -29.91, lng: 30.885 },
  { name: 'Summerstrand', city: 'Gqeberha', lat: -34.001, lng: 25.673 },
];

export const USERS: User[] = [
  { id: 'u_marie', name: 'Marie', email: 'marie@onhold.test', phone: '0821234567', role: 'protected', simpleMode: false, suburb: 'Bellville' },
  { id: 'u_pieter', name: 'Pieter', email: 'pieter@onhold.test', phone: '0839876543', role: 'guardian', simpleMode: false, suburb: 'Durbanville' },
  { id: 'u_thabo', name: 'Thabo', email: 'thabo@onhold.test', phone: '0711112222', role: 'protected', simpleMode: false, suburb: 'Hatfield' },
  { id: 'u_lerato', name: 'Lerato', email: 'admin@onhold.test', phone: null, role: 'admin', simpleMode: false, suburb: 'Sandton' },
];

// Verdict copy. Plain language, never "certainly safe" (pitch: technical challenges).
type VerdictCopy = Pick<CheckResult, 'verdict' | 'confidence' | 'scamType' | 'headline' | 'reasons' | 'nextSteps' | 'sayThis'>;

export const GENERIC_SAY = "I don't do this over the phone. I'll phone you back on an official number. Goodbye.";

export const VERDICTS: Record<string, VerdictCopy> = {
  aarto: {
    verdict: 'stop',
    confidence: 0.94,
    scamType: 'aarto',
    headline: "Don't pay it. This looks like a fake traffic fine.",
    reasons: [
      'It pushes you to pay today for a big discount. Real fines don’t rush you like this.',
      'Official AARTO links end in aarto.gov.za. This one doesn’t.',
      'Fake AARTO fine messages are going around South Africa right now.',
    ],
    nextSteps: [
      'Don’t tap the link or pay anything.',
      'Worried about a real fine? Type aarto.gov.za yourself and use the 16-digit notice number.',
      'Delete the message, or report it so others are warned.',
    ],
  },
  bank: {
    verdict: 'stop',
    confidence: 0.96,
    scamType: 'bank',
    headline: 'Don’t share any code. Your bank will never ask for it.',
    reasons: [
      'Real banks never ask for your OTP, PIN or password, not even their fraud team.',
      'Saying your money is in danger is a trick to rush you.',
      'Approving something in your banking app sends money out. It can’t “reverse” fraud.',
    ],
    nextSteps: [
      'Hang up or don’t reply.',
      'Phone your bank yourself on the number on the back of your card.',
      'Already shared a code? Call your bank right now.',
    ],
    sayThis: 'I’ll phone my bank myself on the number on my card. Goodbye.',
  },
  family: {
    verdict: 'stop',
    confidence: 0.88,
    scamType: 'family',
    headline: 'Check it’s really them before you send anything.',
    reasons: [
      'A “new number” plus a request for money is a common WhatsApp scam.',
      'They often say they can’t talk on the phone right now.',
      'The money is urgent, and often goes to someone else’s account.',
    ],
    nextSteps: [
      'Phone your family member on their old number.',
      'Ask something only the real person would know.',
      'Don’t send money until you’ve spoken to them.',
    ],
  },
  sassa: {
    verdict: 'stop',
    confidence: 0.92,
    scamType: 'sassa',
    headline: 'Don’t share your details. SASSA never charges a fee.',
    reasons: [
      'SASSA never asks for a fee, your PIN or banking passwords.',
      'The only official SRD website is srd.sassa.gov.za.',
      'Scammers time these messages around grant payment dates.',
    ],
    nextSteps: [
      'Don’t tap the link or reply.',
      'Phone SASSA yourself on 0800 60 10 11 (free).',
      'Ask someone you trust to look at it with you.',
    ],
  },
  sars: {
    verdict: 'stop',
    confidence: 0.9,
    scamType: 'sars',
    headline: 'Don’t click. SARS won’t ask for your details like this.',
    reasons: [
      'SARS won’t ask for your personal, tax, banking or eFiling details in an email or SMS.',
      'Real refunds go into the bank account already on your SARS profile.',
      '“Claim now or lose it” is a pressure trick.',
    ],
    nextSteps: [
      'Don’t open the link.',
      'Log in to eFiling yourself at sars.gov.za, or phone SARS on 0800 00 7277.',
      'Forward the message to phishing@sars.gov.za.',
    ],
  },
  courier: {
    verdict: 'stop',
    confidence: 0.86,
    scamType: 'courier',
    headline: 'Don’t pay. This looks like a fake delivery fee.',
    reasons: [
      'A tiny “redelivery” or “customs” fee is a way to steal card details.',
      'The link doesn’t go to the courier’s real website.',
      'Were you expecting a parcel?',
    ],
    nextSteps: [
      'Don’t tap the link.',
      'Track parcels on the courier’s own website, typed in yourself.',
      'Entered card details? Phone your bank now.',
    ],
  },
  jobs: {
    verdict: 'stop',
    confidence: 0.9,
    scamType: 'jobs',
    headline: 'This “job” is a trap. Don’t send money.',
    reasons: [
      'Real jobs don’t pay you to like videos or rate products.',
      'They pay a little first, then ask you to deposit money to “unlock” more.',
      'A stranger on WhatsApp offering easy money is a red flag.',
    ],
    nextSteps: ['Don’t reply or join the group.', 'Never pay to get a job.', 'Block and report the number.'],
  },
  debicheck: {
    verdict: 'stop',
    confidence: 0.89,
    scamType: 'debicheck',
    headline: 'Don’t approve it. Only accept a debit order you set up yourself.',
    reasons: [
      'Approving a DebiCheck lets money leave your account, often every month.',
      'Scammers phone and ask you to “confirm” a debit order you never asked for.',
      'Check the company name, amount and date. If anything looks wrong, reject it.',
    ],
    nextSteps: [
      'Reject the request in your banking app or SMS.',
      'Not sure? Phone your bank on the number on your card.',
      'Tell family if someone keeps phoning about it.',
    ],
    sayThis: 'I don’t approve anything over the phone. Goodbye.',
  },
  investment: {
    verdict: 'stop',
    confidence: 0.85,
    scamType: 'investment',
    headline: 'Guaranteed big returns are a warning sign. Don’t invest.',
    reasons: [
      'Nobody can guarantee you’ll double your money.',
      'Pressure to join quickly or keep it secret is a red flag.',
      'Real investment providers are licensed by the FSCA.',
    ],
    nextSteps: [
      'Don’t send money or crypto.',
      'Check the company on the FSCA website, fsca.co.za.',
      'Talk it over with someone you trust first.',
    ],
  },
  safe: {
    verdict: 'safe',
    confidence: 0.72,
    scamType: null,
    headline: 'This looks okay.',
    reasons: ['It doesn’t ask for money, codes or personal details.', 'There’s no pressure to act quickly.'],
    nextSteps: ['If they later ask for money or a code, check again.', 'Still unsure? Ask someone you trust.'],
  },
  unclear: {
    verdict: 'wait',
    confidence: 0.5,
    scamType: null,
    headline: 'Wait. Check this with someone before you act.',
    reasons: [
      'We couldn’t find clear warning signs, but we can’t rule out a scam either.',
      'If it asks for money, codes or personal details, treat it as a scam.',
    ],
    nextSteps: [
      'Don’t pay or share any codes yet.',
      'Contact the company yourself on a number you already trust.',
      'Ask family for a second opinion.',
    ],
  },
};

// ponytail: keyword table stands in for Claude until Phase 2.
export const CHECK_RULES: [RegExp, keyof typeof VERDICTS][] = [
  [/aarto|traffic fine|fine.*(discount|pay)|licence disc/i, 'aarto'],
  [/new number|hi (mom|mum|ma|mamma|dad|pa|ouma|oupa|gogo)\b/i, 'family'],
  [/debicheck|debit order|mandate/i, 'debicheck'],
  [/\botp\b|one.?time (pin|password)|fraud department|approve|reverse|\bbank\b|\bpin\b/i, 'bank'],
  [/sassa|\bsrd\b|grant/i, 'sassa'],
  [/\bsars\b|efiling|tax refund/i, 'sars'],
  [/parcel|courier|customs|redeliver|delivery fee/i, 'courier'],
  [/earn r?\d|\d+ (a|per) day|like videos|rate products|part.?time/i, 'jobs'],
  [/invest|crypto|bitcoin|double your money|guaranteed returns?/i, 'investment'],
  [/appointment|happy birthday|see you|thank you|thanks|lunch|church/i, 'safe'],
];

// A message mentioning money, links or codes is never "safe" in the mock.
export const RISKY_HINT = /https?:|www\.|\.co\b|\.com\b|\br ?\d|\bpay|\blink|click|\bcode|password/i;

export const CALL_HINT = /\b(phon(e|ed|ing)|call(ed|ing)?|caller|on the line|rang)\b|says (he|she|they)('s| is| are) from/i;

export const CHECKS: CheckResult[] = [
  { id: 'c_seed1', userId: 'u_marie', kind: 'message', createdAt: ago(3), ...VERDICTS.aarto },
  { id: 'c_seed2', userId: 'u_marie', kind: 'call', createdAt: ago(30), ...VERDICTS.bank },
  { id: 'c_seed3', userId: 'u_thabo', kind: 'message', createdAt: ago(50), ...VERDICTS.courier },
];

export const LINKS: GuardianLink[] = [
  {
    id: 'l_1',
    guardianId: 'u_pieter',
    guardianName: 'Pieter',
    guardianPhone: '0839876543',
    protectedId: 'u_marie',
    protectedName: 'Marie',
    invitedPhone: '0821234567',
    code: 'MARIE1',
    status: 'active',
    shareCalls: true,
    shareVerdicts: true,
  },
  {
    id: 'l_2',
    guardianId: 'u_pieter',
    guardianName: 'Pieter',
    guardianPhone: '0839876543',
    protectedId: null,
    protectedName: 'Johan',
    invitedPhone: '0825550000',
    code: 'JOHAN7',
    status: 'pending',
    shareCalls: true,
    shareVerdicts: true,
  },
];

export const ALERTS: AlertItem[] = [
  { id: 'a_1', linkId: 'l_1', personName: 'Marie', type: 'stop_verdict', checkId: 'c_seed1', detail: 'Got a Stop on a fake traffic fine SMS', seen: false, createdAt: ago(3) },
  { id: 'a_2', linkId: 'l_1', personName: 'Marie', type: 'stop_verdict', checkId: 'c_seed2', detail: 'Got a Stop during a call from a fake bank', seen: true, createdAt: ago(30) },
  { id: 'a_3', linkId: 'l_1', personName: 'Marie', type: 'invite_accepted', checkId: null, detail: 'Accepted your invite', seen: true, createdAt: ago(24 * 9) },
];

const SAMPLE_TEXT: Record<ScamType, string[]> = {
  bank: ['Caller said he was from the fraud department and asked for the OTP.', 'Told to approve a notification in the app to “stop” a payment.'],
  sassa: ['SMS said my SRD payment is on hold and to update details on a link.', 'WhatsApp offering to fast-track a grant for a R100 fee.'],
  sars: ['Email saying I have a refund of R3,214, with a link to verify my bank details.'],
  aarto: ['SMS with my registration number offering 50% off a fine if I pay today.', 'WhatsApp saying my licence disc will be blocked unless I pay R250.'],
  family: ['“Hi Ma, this is my new number”, then asked for R2,500 urgently.', 'Pretended to be my grandson, said he was in trouble and needed money.'],
  courier: ['SMS about a parcel needing a R28.50 redelivery fee.'],
  jobs: ['Offered R800 a day to like YouTube videos, then asked for a deposit.'],
  debicheck: ['Caller about “funeral cover” told me to approve the bank SMS.'],
  investment: ['WhatsApp group promising to double my money with crypto in a week.'],
  other: ['Suspicious message asking for my ID number.'],
};

// [suburb, type, channel, how many] → approved community reports spread over the last 2 weeks.
const SEED: [string, ScamType, Channel, number][] = [
  ['Soweto', 'sassa', 'sms', 6],
  ['Soweto', 'bank', 'call', 3],
  ['Centurion', 'aarto', 'sms', 7],
  ['Bellville', 'family', 'whatsapp', 5],
  ['Bellville', 'aarto', 'sms', 3],
  ['Sandton', 'investment', 'whatsapp', 4],
  ['Sandton', 'jobs', 'whatsapp', 3],
  ['Umhlanga', 'bank', 'call', 6],
  ['Hatfield', 'courier', 'sms', 5],
  ['Mamelodi', 'sassa', 'whatsapp', 5],
  ['Durbanville', 'debicheck', 'call', 5],
  ['Mitchells Plain', 'jobs', 'whatsapp', 3],
  ['Pinetown', 'courier', 'sms', 2],
];

let n = 0;
export const REPORTS: Report[] = SEED.flatMap(([suburb, scamType, channel, count]): Report[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `r_seed${++n}`,
    reporterId: `u_comm${n % 9}`,
    checkId: null,
    channel,
    scamType,
    description: SAMPLE_TEXT[scamType][i % SAMPLE_TEXT[scamType].length],
    sender: null,
    suburb,
    status: 'approved',
    rejectReason: null,
    createdAt: ago(((n * 37) % 300) + 2),
  })),
).concat([
  { id: 'r_marie1', reporterId: 'u_marie', checkId: 'c_seed1', channel: 'sms', scamType: 'aarto', description: 'SMS with my registration number offering 50% off if I paid today.', sender: '+27 61 555 0192', suburb: 'Bellville', status: 'approved', rejectReason: null, createdAt: ago(2) },
  { id: 'r_pend1', reporterId: 'u_thabo', checkId: 'c_seed3', channel: 'sms', scamType: 'courier', description: 'Parcel redelivery fee link, I wasn’t expecting anything.', sender: 'tcg-redeliver.com', suburb: 'Hatfield', status: 'pending', rejectReason: null, createdAt: ago(5) },
  { id: 'r_pend2', reporterId: 'u_comm3', checkId: null, channel: 'call', scamType: 'bank', description: 'Man from “Capitec fraud” asked me to read out the code.', sender: '010 555 0134', suburb: 'Randburg', status: 'pending', rejectReason: null, createdAt: ago(8) },
  { id: 'r_pend3', reporterId: 'u_comm4', checkId: null, channel: 'whatsapp', scamType: 'other', description: 'This number is my ex, he is a scammer!!', sender: '082 000 1111', suburb: 'Sea Point', status: 'pending', rejectReason: null, createdAt: ago(9) },
]);

export const EXPLAINERS: Explainer[] = [
  {
    slug: 'bank-fraud-call',
    scamType: 'bank',
    title: 'The “bank fraud department” call',
    summary: 'Someone phones pretending to be your bank and says your money is in danger.',
    example: {
      channel: 'call',
      text: '“Good afternoon, this is Thandi from the fraud department. We’ve stopped a payment of R4,800. To reverse it, read me the code we just sent and approve the notification in your app.”',
    },
    signs: [
      'They ask for an OTP, PIN or password. Banks never do.',
      'They want you to “approve” something in your banking app to stop fraud.',
      'They already know some of your details, so they sound real.',
      'They keep you on the line and rush you.',
    ],
    whatToDo: [
      'Hang up. A real bank will understand.',
      'Phone your bank yourself on the number on the back of your card.',
      'Shared a code or approved something? Call your bank immediately.',
    ],
    source: { name: 'SABRIC', url: 'https://www.sabric.co.za/' },
  },
  {
    slug: 'sassa-grant',
    scamType: 'sassa',
    title: 'Fake SASSA grant messages',
    summary: 'Messages or calls about your grant or SRD payment that ask for your details or a fee.',
    example: {
      channel: 'sms',
      text: 'SASSA: Your SRD R370 payment is ON HOLD. Update your details within 24hrs to avoid cancellation: srd-sassa-pay.co.za',
    },
    signs: [
      'SASSA never charges a fee to apply or to “unlock” a payment.',
      'The link isn’t srd.sassa.gov.za.',
      'They ask for your ID number, PIN or banking details.',
      'These messages often arrive just before payment dates.',
    ],
    whatToDo: [
      'Don’t tap the link or reply.',
      'Phone SASSA yourself on 0800 60 10 11 (free, weekdays 08:00–16:00).',
      'Only use srd.sassa.gov.za, typed in yourself.',
    ],
    source: { name: 'SAnews: SASSA warns beneficiaries', url: 'https://www.sanews.gov.za/node/60295' },
  },
  {
    slug: 'sars-refund',
    scamType: 'sars',
    title: 'Fake SARS refunds',
    summary: 'An email or SMS says you’re owed a tax refund and must “claim” it through a link.',
    example: {
      channel: 'email',
      text: 'SARS eFiling: You are eligible for a refund of R3,214.60. Verify your banking details within 48 hours to receive payment.',
    },
    signs: [
      'SARS won’t ask for your personal, tax, banking or eFiling details in an email.',
      'Real refunds go into the account already on your SARS profile.',
      '“Claim now or lose it” pressure.',
    ],
    whatToDo: [
      'Don’t open the link.',
      'Log in to eFiling yourself at sars.gov.za, or phone SARS on 0800 00 7277.',
      'Forward the message to phishing@sars.gov.za.',
    ],
    source: { name: 'SARS scam warning', url: 'https://www.sars.gov.za/media-release/11-february-2013-warning-to-taxpayers-on-scams/' },
  },
  {
    slug: 'aarto-fine',
    scamType: 'aarto',
    title: 'Fake traffic fines (AARTO)',
    summary: 'An SMS or WhatsApp says you have a traffic fine and offers 50% off if you pay today.',
    example: {
      channel: 'sms',
      text: 'AARTO: Outstanding fine R500 for vehicle CA 123-456. Pay within 24hrs for 50% discount or your licence disc will be blocked.',
    },
    signs: [
      'A big discount for paying right now.',
      'Threats to block your licence or vehicle disc.',
      'Official links end in aarto.gov.za. Links ending in .com, .co.za or .online are fake.',
      'It may even know your real registration number.',
    ],
    whatToDo: [
      'Don’t click the link.',
      'Check for real fines yourself at aarto.gov.za using the 16-digit infringement notice number.',
      'Delete the message, and report it here so others are warned.',
    ],
    source: { name: 'SAnews: RTIA warns motorists', url: 'https://www.sanews.gov.za/node/84463' },
  },
  {
    slug: 'hi-mom-new-number',
    scamType: 'family',
    title: '“Hi Mom, this is my new number”',
    summary: 'A WhatsApp from an unknown number pretends to be your child or grandchild and asks for money.',
    example: {
      channel: 'whatsapp',
      text: 'Hi Ma, it’s me. My phone fell in the water so this is my new number. I need to pay a supplier urgently, can you send R2,500? I’ll pay you back tomorrow ❤️',
    },
    signs: [
      'A new number you’ve never seen.',
      'They can’t talk on the phone “right now”.',
      'An urgent request for money, often to someone else’s account.',
    ],
    whatToDo: [
      'Phone your family member on their old number.',
      'Ask something only the real person would know.',
      'Never send money until you’ve spoken to them.',
    ],
    source: { name: 'SABRIC', url: 'https://www.sabric.co.za/' },
  },
  {
    slug: 'courier-fee',
    scamType: 'courier',
    title: 'Fake delivery fees',
    summary: 'An SMS says your parcel is waiting and you must pay a small fee to get it.',
    example: {
      channel: 'sms',
      text: 'Parcel notice: We could not deliver your package. Pay R28.50 redelivery fee within 12 hours or it will be returned.',
    },
    signs: [
      'A tiny fee. They want your card details, not R28.',
      'You weren’t expecting a parcel.',
      'The link isn’t the courier’s real website.',
    ],
    whatToDo: [
      'Don’t tap the link.',
      'Track parcels on the courier’s own website, typed in yourself.',
      'Entered card details? Phone your bank now.',
    ],
    source: { name: 'SABRIC', url: 'https://www.sabric.co.za/' },
  },
  {
    slug: 'whatsapp-jobs',
    scamType: 'jobs',
    title: 'WhatsApp “easy money” jobs',
    summary: 'A stranger offers you money to like videos or rate products, then asks you to pay in.',
    example: {
      channel: 'whatsapp',
      text: 'Hello! We are hiring part-time. Earn R800–R3,000 a day by liking YouTube videos. No experience needed. Reply YES to start.',
    },
    signs: [
      'Easy money for simple tasks.',
      'They pay you a little first to win your trust.',
      'Then you must “deposit” money to unlock bigger tasks.',
    ],
    whatToDo: ['Don’t reply or join the group.', 'Never pay to get a job.', 'Block and report the number.'],
    source: { name: 'SABRIC', url: 'https://www.sabric.co.za/' },
  },
  {
    slug: 'debicheck',
    scamType: 'debicheck',
    title: 'DebiCheck approval tricks',
    summary: 'Someone gets you to approve a debit order you never agreed to.',
    example: {
      channel: 'call',
      text: '“Hi, I’m calling about your funeral cover upgrade. You’ll get an SMS from your bank in a moment. Please just approve it so we can confirm.”',
    },
    signs: [
      'You’re asked to approve a debit order you didn’t set up.',
      'The company, amount or date doesn’t match anything you signed.',
      'Someone on the phone is telling you to approve it.',
    ],
    whatToDo: [
      'Reject the request in your banking app or SMS.',
      'Not sure? Phone your bank on the number on your card.',
      'Query any debit order you don’t recognise with your bank straight away.',
    ],
    source: { name: 'Arcadia Finance', url: 'https://www.arcadiafinance.co.za/news/older-sassa-beneficiaries-targeted-by-scammers/' },
  },
];
