// Pure validation logic, deliberately kept free of any component/RN/network
// import -- ReportForm.tsx (which pulls in SuburbPicker -> api.ts -> the
// Supabase client -> AsyncStorage's native module) can't be unit tested
// without a much heavier jest setup; this can.
import type { Channel, ScamType } from './types';

export type ReportDraft = { channel: Channel | null; scamType: ScamType | null; description: string; sender: string; suburb: string | null };

type Errors = Partial<Record<keyof ReportDraft, string>>;

/** Field rules for a scam report. Returns no keys when the draft is valid. */
export function validateReport(d: ReportDraft): Errors {
  const e: Errors = {};
  if (!d.channel) e.channel = 'How did it reach you?';
  if (!d.scamType) e.scamType = 'Pick the closest type, or “Something else”.';
  const len = d.description.trim().length;
  if (len < 10) e.description = 'Tell us a little more (at least 10 characters).';
  else if (len > 1000) e.description = 'Please keep it under 1000 characters.';
  if (d.sender.trim().length > 100) e.sender = 'That’s too long for a number or link.';
  if (!d.suburb) e.suburb = 'Choose the area you’re in, so others nearby are warned.';
  return e;
}
