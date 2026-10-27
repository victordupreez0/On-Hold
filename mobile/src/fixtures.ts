// UI label/icon maps for the Postgres enums (scam_type, channel). These are
// tied to code -- adding a type needs a migration and a redeploy either way
// -- so they stay static. Suburbs and Learn explainers are DB-backed and
// admin-editable now; fetch them via api.listSuburbs()/listExplainers().
import { colors } from './theme';
import type { Channel, Role, ScamType } from './types';

export const SCAM_LABELS: Record<ScamType, string> = {
  bank: 'Fake bank call',
  sassa: 'SASSA grant scam',
  sars: 'Fake SARS refund',
  aarto: 'Fake traffic fine',
  family: '“Hi Ma, new number”',
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

export const ROLE_PILL: Record<Role, { label: string; bg: string }> = {
  protected: { label: 'Protected', bg: colors.grey },
  guardian: { label: 'Guardian', bg: colors.highlighter },
  admin: { label: 'Admin', bg: colors.safeTint },
};
