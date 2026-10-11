// Mock API. Every function here is the contract Phase 2's backend implements;
// screens never touch fixtures directly, so swapping bodies for real calls leaves them unchanged.
import * as Linking from 'expo-linking';

import {
  ALERTS,
  CALL_HINT,
  CHECK_RULES,
  CHECKS,
  EXPLAINERS,
  GENERIC_SAY,
  LINKS,
  REPORTS,
  RISKY_HINT,
  SUBURBS,
  USERS,
  VERDICTS,
} from './fixtures';
import type {
  AlertItem,
  AreaStat,
  Channel,
  CheckInput,
  CheckResult,
  Circulating,
  GuardianLink,
  Report,
  ReportInput,
  Role,
  ScamType,
  User,
} from './types';

const MAP_THRESHOLD = 5; // pitch: an area stays hidden until it has at least 5 reports
const CIRCULATING_DAYS = 14;

const wait = (ms = 450 + Math.random() * 400) => new Promise((r) => setTimeout(r, ms));
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

let me: User | null = null;

function requireUser(): User {
  if (!me) throw new Error('Please sign in again.');
  return me;
}

function requireRole(role: Role) {
  if (requireUser().role !== role) throw new Error('You don’t have access to that.');
}

// ---------- Auth ----------

export async function signUp(input: { name: string; email: string; password: string; role: Role }) {
  await wait();
  const email = input.email.trim().toLowerCase();
  if (USERS.some((u) => u.email === email)) throw new Error('An account with that email already exists.');
  const user: User = {
    id: uid('u'),
    name: input.name.trim(),
    email,
    phone: null,
    role: input.role,
    simpleMode: false,
    readAloud: input.role === 'protected',
    suburb: null,
  };
  USERS.push(user);
  me = user;
  return { ...user };
}

// ponytail: mock sign-in accepts any password of 8+ characters; Supabase Auth replaces this.
export async function signIn(input: { email: string; password: string }) {
  await wait();
  const user = USERS.find((u) => u.email === input.email.trim().toLowerCase());
  if (!user || input.password.length < 8) throw new Error('That email and password don’t match.');
  me = user;
  return { ...user };
}

export async function signOut() {
  await wait(200);
  me = null;
}

export async function updateProfile(patch: Partial<Pick<User, 'name' | 'phone' | 'simpleMode' | 'readAloud' | 'suburb' | 'role'>>) {
  const user = requireUser();
  await wait(250);
  Object.assign(user, patch);
  return { ...user };
}

// ---------- Checks ----------

function verdictFor(input: CheckInput) {
  const text = input.text ?? '';
  if (!text && input.imageUri) return VERDICTS.aarto; // ponytail: screenshots read by Claude vision in Phase 2
  const key = CHECK_RULES.find(([re]) => re.test(text))?.[1] ?? 'unclear';
  return key === 'safe' && RISKY_HINT.test(text) ? VERDICTS.unclear : VERDICTS[key];
}

export async function check(input: CheckInput): Promise<CheckResult> {
  const user = requireUser();
  await wait(1200);
  if (/test-error/i.test(input.text ?? '')) throw new Error('The checker is unavailable right now.');

  const base = verdictFor(input);
  const kind = input.kind === 'call' || CALL_HINT.test(input.text ?? '') ? 'call' : 'message';
  const result: CheckResult = {
    ...base,
    id: uid('c'),
    userId: user.id,
    kind,
    sayThis: kind === 'call' && base.verdict !== 'safe' ? (base.sayThis ?? GENERIC_SAY) : undefined,
    createdAt: new Date().toISOString(),
  };
  CHECKS.unshift(result);

  // Consent-based alerts: a Stop reaches guardians only where the protected person chose to share it.
  if (result.verdict === 'stop') {
    for (const link of LINKS) {
      const shares = kind === 'call' ? link.shareCalls : link.shareVerdicts;
      if (link.protectedId === user.id && link.status === 'active' && shares) pushAlert(link, 'stop_verdict', result);
    }
  }
  return result;
}

export async function transcribe(_audioUri: string): Promise<string> {
  await wait(900);
  // ponytail: canned transcript until the transcription endpoint exists in Phase 2.
  return 'A man phoned saying he is from the bank’s fraud department. He says someone is stealing from my account and I must read him the code they just sent me.';
}

export async function getCheck(id: string) {
  await wait(200);
  const found = CHECKS.find((c) => c.id === id && c.userId === requireUser().id);
  if (!found) throw new Error('We couldn’t find that check.');
  return { ...found };
}

export async function listMyChecks() {
  const user = requireUser();
  await wait();
  return CHECKS.filter((c) => c.userId === user.id);
}

// ---------- Reports ----------

export async function listMyReports() {
  const user = requireUser();
  await wait();
  return REPORTS.filter((r) => r.reporterId === user.id).sort(newestFirst);
}

export async function getReport(id: string) {
  await wait(200);
  const found = REPORTS.find((r) => r.id === id && r.reporterId === requireUser().id);
  if (!found) throw new Error('We couldn’t find that report.');
  return { ...found };
}

export async function createReport(input: ReportInput) {
  const user = requireUser();
  await wait();
  const report: Report = {
    id: uid('r'),
    reporterId: user.id,
    checkId: input.checkId ?? null,
    channel: input.channel,
    scamType: input.scamType,
    description: input.description.trim(),
    sender: input.sender?.trim() || null,
    suburb: input.suburb,
    status: 'pending',
    rejectReason: null,
    createdAt: new Date().toISOString(),
  };
  REPORTS.push(report);
  return { ...report };
}

export async function updateReport(id: string, input: ReportInput) {
  await wait();
  const report = REPORTS.find((r) => r.id === id && r.reporterId === requireUser().id);
  if (!report) throw new Error('We couldn’t find that report.');
  // Edited reports go back to review so an approved report can't be changed into something abusive.
  Object.assign(report, { ...input, sender: input.sender?.trim() || null, status: 'pending', rejectReason: null });
  return { ...report };
}

export async function deleteReport(id: string) {
  await wait();
  const i = REPORTS.findIndex((r) => r.id === id && r.reporterId === requireUser().id);
  if (i === -1) throw new Error('We couldn’t find that report.');
  REPORTS.splice(i, 1);
}

// ---------- Map & awareness ----------

export async function listAreaStats(filter: { scamType?: ScamType; channel?: Channel } = {}): Promise<AreaStat[]> {
  await wait();
  const approved = REPORTS.filter((r) => r.status === 'approved');
  return SUBURBS.flatMap((suburb) => {
    const inArea = approved.filter((r) => r.suburb === suburb.name);
    if (inArea.length < MAP_THRESHOLD) return [];
    const matching = inArea.filter(
      (r) => (!filter.scamType || r.scamType === filter.scamType) && (!filter.channel || r.channel === filter.channel),
    );
    if (!matching.length) return [];
    return [{ ...suburb, count: matching.length, topType: mostCommon(matching.map((r) => r.scamType)) }];
  }).sort((a, b) => b.count - a.count);
}

export async function listCirculating(): Promise<Circulating[]> {
  await wait();
  const since = Date.now() - CIRCULATING_DAYS * 86_400_000;
  const recent = REPORTS.filter((r) => r.status === 'approved' && Date.parse(r.createdAt) >= since);
  const mySuburb = me?.suburb;
  const byType = new Map<ScamType, Circulating>();
  for (const r of recent) {
    const row = byType.get(r.scamType) ?? { scamType: r.scamType, count: 0, nearYou: 0, latestAt: r.createdAt };
    row.count += 1;
    if (r.suburb === mySuburb) row.nearYou += 1;
    if (r.createdAt > row.latestAt) row.latestAt = r.createdAt;
    byType.set(r.scamType, row);
  }
  return [...byType.values()].sort((a, b) => b.nearYou - a.nearYou || b.count - a.count).slice(0, 4);
}

export async function listExplainers() {
  await wait(150);
  return EXPLAINERS;
}

export async function getExplainer(slug: string) {
  await wait(150);
  const found = EXPLAINERS.find((e) => e.slug === slug);
  if (!found) throw new Error('We couldn’t find that guide.');
  return found;
}

export async function listSuburbs() {
  return SUBURBS;
}

// ---------- Family ----------

export async function getFamily() {
  const user = requireUser();
  await wait();
  const withPhone = (l: GuardianLink) => ({ ...l, guardianPhone: USERS.find((u) => u.id === l.guardianId)?.phone ?? null });
  return {
    lookingAfter: LINKS.filter((l) => l.guardianId === user.id).map(withPhone),
    lookedAfterBy: LINKS.filter((l) => l.protectedId === user.id).map(withPhone),
  };
}

export async function listAlerts() {
  const user = requireUser();
  await wait();
  const mine = new Set(LINKS.filter((l) => l.guardianId === user.id).map((l) => l.id));
  return ALERTS.filter((a) => mine.has(a.linkId)).sort(newestFirst);
}

export async function markAlertsSeen() {
  const user = requireUser();
  const mine = new Set(LINKS.filter((l) => l.guardianId === user.id).map((l) => l.id));
  ALERTS.forEach((a) => mine.has(a.linkId) && (a.seen = true));
}

export async function createInvite(input: { name: string; phone: string }) {
  const user = requireUser();
  await wait();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const link: GuardianLink = {
    id: uid('l'),
    guardianId: user.id,
    guardianName: user.name,
    guardianPhone: user.phone,
    protectedId: null,
    protectedName: input.name.trim(),
    invitedPhone: input.phone.replace(/\s/g, ''),
    code,
    status: 'pending',
    shareCalls: true,
    shareVerdicts: true,
  };
  LINKS.push(link);
  return { code, url: Linking.createURL('/family/accept', { queryParams: { code } }) };
}

export async function getInvite(code: string) {
  await wait(300);
  const link = LINKS.find((l) => l.code === code.trim().toUpperCase() && l.status === 'pending');
  if (!link) throw new Error('This invite has expired or was already used.');
  return { guardianName: link.guardianName, code: link.code };
}

export async function acceptInvite(code: string, share: { shareCalls: boolean; shareVerdicts: boolean }) {
  const user = requireUser();
  await wait();
  const link = LINKS.find((l) => l.code === code.trim().toUpperCase() && l.status === 'pending');
  if (!link) throw new Error('This invite has expired or was already used.');
  if (link.guardianId === user.id) throw new Error('You can’t accept your own invite.');
  Object.assign(link, { ...share, protectedId: user.id, protectedName: user.name, status: 'active' });
  pushAlert(link, 'invite_accepted');
  return { ...link };
}

export async function updateSharing(linkId: string, share: { shareCalls: boolean; shareVerdicts: boolean }) {
  await wait(250);
  const link = LINKS.find((l) => l.id === linkId && l.protectedId === requireUser().id);
  if (!link) throw new Error('We couldn’t find that family link.');
  Object.assign(link, share);
  return { ...link };
}

export async function removeLink(linkId: string) {
  const user = requireUser();
  await wait();
  const i = LINKS.findIndex((l) => l.id === linkId && (l.protectedId === user.id || l.guardianId === user.id));
  if (i === -1) throw new Error('We couldn’t find that family link.');
  LINKS.splice(i, 1);
}

/** "Tell my family": the person chose to share this one, so it goes regardless of default sharing. */
export async function alertGuardians(checkId: string) {
  const user = requireUser();
  await wait();
  const check = CHECKS.find((c) => c.id === checkId && c.userId === user.id);
  const links = LINKS.filter((l) => l.protectedId === user.id && l.status === 'active');
  if (!links.length) throw new Error('You haven’t linked any family yet.');
  links.forEach((l) => pushAlert(l, 'asked_for_help', check));
  return links.map((l) => l.guardianName);
}

function pushAlert(link: GuardianLink, type: AlertItem['type'], check?: CheckResult) {
  const detail =
    type === 'invite_accepted'
      ? 'Accepted your invite'
      : type === 'asked_for_help'
        ? `Asked you to look at a ${check?.verdict === 'safe' ? 'message' : 'possible scam'}`
        : `Got a Stop ${check?.kind === 'call' ? 'during a call' : 'on a message'}: ${check?.headline ?? ''}`;
  ALERTS.unshift({
    id: uid('a'),
    linkId: link.id,
    personName: link.protectedName,
    type,
    checkId: check?.id ?? null,
    detail,
    seen: false,
    createdAt: new Date().toISOString(),
  });
}

// ---------- Admin ----------

export async function listPendingReports() {
  requireRole('admin');
  await wait();
  return REPORTS.filter((r) => r.status === 'pending').sort(newestFirst);
}

export async function moderateReport(id: string, decision: 'approved' | 'rejected', reason?: string) {
  requireRole('admin');
  await wait();
  const report = REPORTS.find((r) => r.id === id);
  if (!report) throw new Error('That report no longer exists.');
  Object.assign(report, { status: decision, rejectReason: decision === 'rejected' ? reason?.trim() || null : null });
  return { ...report };
}

// ---------- helpers ----------

function newestFirst<T extends { createdAt: string }>(a: T, b: T) {
  return b.createdAt.localeCompare(a.createdAt);
}

function mostCommon<T>(items: T[]): T {
  const counts = new Map<T, number>();
  items.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
