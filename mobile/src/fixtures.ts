// Static content the backend doesn't own: UI labels/icons, the suburb picker
// list (also seeded server-side so map pins line up) and the Learn explainers.
import type { Channel, Explainer, ScamType, Suburb } from './types';

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

export const CHANNEL_ICONS = {
  sms: 'message-square',
  whatsapp: 'message-circle',
  email: 'mail',
  call: 'phone',
} as const satisfies Record<Channel, string>;

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
