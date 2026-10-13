// Backend API client. Every function here keeps the exact signature it had as
// a mock (see git history) so screens never had to change between phases.
import * as Linking from 'expo-linking';

import { EXPLAINERS } from './fixtures';
import { API_URL, supabase } from './supabase';
import type {
  AlertItem,
  AreaStat,
  Channel,
  ChatTurn,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (init?.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail ?? 'Something went wrong. Please try again.');
  return body as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ---------- Auth ----------

export async function getMe() {
  return get<User>('/me');
}

export async function signUp(input: { name: string; email: string; password: string; role: Role }) {
  const { error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { name: input.name.trim(), role: input.role } },
  });
  if (error) throw new Error(error.message);
  return getMe();
}

export async function signIn(input: { email: string; password: string }) {
  const { error } = await supabase.auth.signInWithPassword({ email: input.email.trim().toLowerCase(), password: input.password });
  if (error) throw new Error('That email and password don’t match.');
  return getMe();
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function updateProfile(patchBody: Partial<Pick<User, 'name' | 'phone' | 'simpleMode' | 'suburb' | 'role'>>) {
  return patch<User>('/me', patchBody);
}

// ---------- Checks ----------

export async function check(input: CheckInput): Promise<CheckResult> {
  return post<CheckResult>('/checks', input);
}

export async function transcribe(_audioUri: string): Promise<string> {
  const { text } = await post<{ text: string }>('/transcribe', { audioUri: _audioUri });
  return text;
}

export async function getCheck(id: string) {
  return get<CheckResult>(`/checks/${id}`);
}

export async function listMyChecks() {
  return get<CheckResult[]>('/checks');
}

/** A free-form follow-up question about an existing check, grounded in its verdict. Nothing here is saved. */
export async function askAboutCheck(checkId: string, question: string, history: ChatTurn[]) {
  const { answer } = await post<{ answer: string }>(`/checks/${checkId}/messages`, { question, history });
  return answer;
}

// ---------- Reports ----------

export async function listMyReports() {
  return get<Report[]>('/reports');
}

export async function getReport(id: string) {
  return get<Report>(`/reports/${id}`);
}

export async function createReport(input: ReportInput) {
  return post<Report>('/reports', input);
}

export async function updateReport(id: string, input: ReportInput) {
  return put<Report>(`/reports/${id}`, input);
}

export async function deleteReport(id: string) {
  await del(`/reports/${id}`);
}

// ---------- Map & awareness ----------

export async function listAreaStats(filter: { scamType?: ScamType; channel?: Channel } = {}): Promise<AreaStat[]> {
  const params = new URLSearchParams();
  if (filter.scamType) params.set('scamType', filter.scamType);
  if (filter.channel) params.set('channel', filter.channel);
  const qs = params.toString();
  return get<AreaStat[]>(`/areas${qs ? `?${qs}` : ''}`);
}

export async function listCirculating(): Promise<Circulating[]> {
  return get<Circulating[]>('/circulating');
}

export async function listExplainers() {
  return EXPLAINERS;
}

export async function getExplainer(slug: string) {
  const found = EXPLAINERS.find((e) => e.slug === slug);
  if (!found) throw new Error('We couldn’t find that guide.');
  return found;
}

export async function listSuburbs() {
  return get<{ name: string; city: string; lat: number; lng: number }[]>('/suburbs');
}

// ---------- Family ----------

export async function getFamily() {
  return get<{ lookingAfter: GuardianLink[]; lookedAfterBy: GuardianLink[] }>('/family');
}

export async function listAlerts() {
  return get<AlertItem[]>('/alerts');
}

export async function markAlertsSeen() {
  await post('/alerts/seen');
}

export async function createInvite(input: { name: string; phone: string }) {
  const { code } = await post<{ code: string }>('/invites', input);
  return { code, url: Linking.createURL('/family/accept', { queryParams: { code } }) };
}

export async function getInvite(code: string) {
  return get<{ guardianName: string; code: string }>(`/invites/${code}`);
}

export async function acceptInvite(code: string, share: { shareCalls: boolean; shareVerdicts: boolean }) {
  return post<GuardianLink>(`/invites/${code}/accept`, share);
}

export async function updateSharing(linkId: string, share: { shareCalls: boolean; shareVerdicts: boolean }) {
  return patch<GuardianLink>(`/links/${linkId}`, share);
}

export async function removeLink(linkId: string) {
  await del(`/links/${linkId}`);
}

/** "Tell my family": the person chose to share this one, so it goes regardless of default sharing. */
export async function alertGuardians(checkId: string) {
  return post<string[]>(`/checks/${checkId}/alert`);
}

// ---------- Admin ----------

export async function listPendingReports() {
  return get<Report[]>('/admin/reports/pending');
}

export async function moderateReport(id: string, decision: 'approved' | 'rejected', reason?: string) {
  return post<Report>(`/admin/reports/${id}/moderate`, { decision, reason });
}
