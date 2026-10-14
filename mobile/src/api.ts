// Backend API client. Every function here keeps the exact signature it had as
// a mock (see git history) so screens never had to change between phases.
import * as Linking from 'expo-linking';
import { isAuthApiError } from '@supabase/supabase-js';

import { API_URL, supabase } from './supabase';
import type {
  AlertItem,
  AreaStat,
  Channel,
  CheckInput,
  CheckResult,
  ChatMessage,
  Circulating,
  Explainer,
  GuardianLink,
  Report,
  ReportInput,
  Role,
  ScamType,
  Suburb,
  User,
} from './types';

/** Thrown for any non-2xx API response. Callers that care which kind of
 * failure this was (e.g. the session recovering from a stale login) check
 * `.status` instead of pattern-matching the message. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

async function request<T>(path: string, init?: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  if (init?.body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    throw new Error('Couldn’t reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // FastAPI's own validation errors (422) carry a list of field problems, not a sentence -- it rendered as "[object Object]".
    const detail = body?.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? 'Some of that isn’t quite right. Check what you entered and try again.' : 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }
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

/** Resolves to null when the project wants the email confirmed first (no session until they tap the link). */
export async function signUp(input: { name: string; email: string; password: string; role: Role }): Promise<User | null> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { name: input.name.trim(), role: input.role } },
  });
  if (error) throw new Error(error.message);
  if (!data.session) return null;
  return getMe();
}

export async function signIn(input: { email: string; password: string }) {
  const { error } = await supabase.auth.signInWithPassword({ email: input.email.trim().toLowerCase(), password: input.password });
  if (error) {
    // A response came back (wrong password, unconfirmed email, etc.) vs. the
    // request never reached the server at all -- those deserve different messages.
    throw new Error(isAuthApiError(error) ? 'That email and password don’t match.' : 'Couldn’t reach the server. Check your connection and try again.');
  }
  return getMe();
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Removes the account and everything tied to it (checks, chats, reports, family links). */
export async function deleteMe() {
  await del('/me');
}

export async function updateProfile(patchBody: Partial<Pick<User, 'name' | 'phone' | 'simpleMode' | 'suburb' | 'role'>>) {
  return patch<User>('/me', patchBody);
}

// ---------- Checks ----------

export async function check(input: CheckInput): Promise<CheckResult> {
  // Longer than the default: a screenshot upload plus the AI read can outlast 20s on a slow connection.
  return request<CheckResult>('/checks', { method: 'POST', body: JSON.stringify(input) }, 45_000);
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

/** Deletes a check and its follow-up chat. */
export async function deleteCheck(id: string) {
  await del(`/checks/${id}`);
}

/** The saved follow-up chat on a check, oldest first. */
export async function listCheckMessages(checkId: string) {
  return get<ChatMessage[]>(`/checks/${checkId}/messages`);
}

/** A free-form follow-up question about an existing check. The server keeps the thread. */
export async function askAboutCheck(checkId: string, question: string) {
  const { answer } = await post<{ answer: string }>(`/checks/${checkId}/messages`, { question });
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
  return get<Explainer[]>('/explainers');
}

export async function getExplainer(slug: string) {
  return get<Explainer>(`/explainers/${slug}`);
}

export async function listSuburbs() {
  return get<Suburb[]>('/suburbs');
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
  return listAllReports({ status: 'pending' });
}

export async function moderateReport(id: string, decision: 'approved' | 'rejected', reason?: string) {
  return post<Report>(`/admin/reports/${id}/moderate`, { decision, reason });
}

export type AdminReport = Report & { moderatedBy: string | null; moderatedAt: string | null };
export type AdminDashboard = {
  users: { total: number; byRole: Record<Role, number> };
  checks: { total: number; byVerdict: Record<CheckResult['verdict'], number>; last7Days: number };
  reports: { total: number; byStatus: Record<Report['status'], number> };
  aiCallsLast24h: number;
  trend: { date: string; count: number }[];
  activity: { type: 'check' | 'report' | 'signup'; id: string; summary: string; createdAt: string }[];
};

export async function getAdminDashboard() {
  return get<AdminDashboard>('/admin/dashboard');
}

export async function listAllReports(filter: { status?: Report['status']; scamType?: ScamType; search?: string; limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.scamType) params.set('scamType', filter.scamType);
  if (filter.search) params.set('search', filter.search);
  if (filter.limit) params.set('limit', String(filter.limit));
  if (filter.offset) params.set('offset', String(filter.offset));
  const qs = params.toString();
  return get<AdminReport[]>(`/admin/reports${qs ? `?${qs}` : ''}`);
}

export async function getAdminReport(id: string) {
  return get<AdminReport>(`/admin/reports/${id}`);
}

export async function adminUpdateReport(id: string, input: ReportInput) {
  return put<AdminReport>(`/admin/reports/${id}`, input);
}

export async function adminDeleteReport(id: string) {
  await del(`/admin/reports/${id}`);
}

export type AdminUser = User & { createdAt: string };

export async function listUsers(filter: { search?: string; role?: Role; limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.role) params.set('role', filter.role);
  if (filter.limit) params.set('limit', String(filter.limit));
  if (filter.offset) params.set('offset', String(filter.offset));
  const qs = params.toString();
  return get<AdminUser[]>(`/admin/users${qs ? `?${qs}` : ''}`);
}

export async function getUser(id: string) {
  return get<AdminUser>(`/admin/users/${id}`);
}

export async function updateUserRole(id: string, role: Role) {
  return patch<AdminUser>(`/admin/users/${id}`, { role });
}

export async function deleteUser(id: string) {
  await del(`/admin/users/${id}`);
}

export async function createExplainer(input: Omit<Explainer, 'id'>) {
  return post<Explainer>('/admin/explainers', flattenExplainer(input));
}

export async function updateExplainer(id: string, input: Omit<Explainer, 'id'>) {
  return put<Explainer>(`/admin/explainers/${id}`, flattenExplainer(input));
}

export async function deleteExplainer(id: string) {
  await del(`/admin/explainers/${id}`);
}

function flattenExplainer(input: Omit<Explainer, 'id'>) {
  return {
    slug: input.slug,
    scamType: input.scamType,
    title: input.title,
    summary: input.summary,
    exampleChannel: input.example.channel,
    exampleText: input.example.text,
    signs: input.signs,
    whatToDo: input.whatToDo,
    sourceName: input.source.name,
    sourceUrl: input.source.url,
  };
}

export async function createSuburb(suburb: Suburb) {
  return post<Suburb>('/admin/suburbs', suburb);
}

export async function updateSuburb(name: string, input: Omit<Suburb, 'name'>) {
  return put<Suburb>(`/admin/suburbs/${name}`, input);
}

export async function deleteSuburb(name: string) {
  await del(`/admin/suburbs/${name}`);
}
