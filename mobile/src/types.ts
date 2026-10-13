// Shared shapes for the app. Phase 2's FastAPI responses must match these.

export type Role = 'protected' | 'guardian' | 'admin';
export type Verdict = 'stop' | 'wait' | 'safe';
export type Channel = 'sms' | 'whatsapp' | 'email' | 'call';
export type ScamType =
  | 'bank'
  | 'sassa'
  | 'sars'
  | 'aarto'
  | 'family'
  | 'courier'
  | 'jobs'
  | 'debicheck'
  | 'investment'
  | 'other';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  simpleMode: boolean;
  suburb: string | null;
};

export type CheckInput = {
  kind: 'message' | 'call';
  text?: string;
  image?: { base64: string; mediaType: string };
};

export type CheckResult = {
  id: string;
  userId: string;
  kind: 'message' | 'call';
  verdict: Verdict;
  confidence: number;
  scamType: ScamType | null;
  headline: string;
  reasons: string[];
  nextSteps: string[];
  sayThis?: string;
  createdAt: string;
};

export type ReportStatus = 'pending' | 'approved' | 'rejected';

export type Report = {
  id: string;
  reporterId: string;
  checkId: string | null;
  channel: Channel;
  scamType: ScamType;
  description: string;
  sender: string | null;
  suburb: string;
  status: ReportStatus;
  rejectReason: string | null;
  createdAt: string;
};

export type ReportInput = Pick<Report, 'channel' | 'scamType' | 'description' | 'sender' | 'suburb'> & {
  checkId?: string | null;
};

export type Suburb = { name: string; city: string; lat: number; lng: number };

export type AreaStat = Suburb & { count: number; topType: ScamType };

export type Circulating = { scamType: ScamType; count: number; nearYou: number; latestAt: string };

export type GuardianLink = {
  id: string;
  guardianId: string;
  guardianName: string;
  guardianPhone: string | null;
  protectedId: string | null;
  protectedName: string;
  invitedPhone: string | null;
  code: string;
  status: 'pending' | 'active';
  shareCalls: boolean;
  shareVerdicts: boolean;
};

export type AlertItem = {
  id: string;
  linkId: string;
  personName: string;
  type: 'stop_verdict' | 'wait_verdict' | 'asked_for_help' | 'invite_accepted';
  checkId: string | null;
  detail: string;
  seen: boolean;
  createdAt: string;
};

export type Explainer = {
  slug: string;
  scamType: ScamType;
  title: string;
  summary: string;
  example: { channel: Channel; text: string };
  signs: string[];
  whatToDo: string[];
  source: { name: string; url: string };
};
