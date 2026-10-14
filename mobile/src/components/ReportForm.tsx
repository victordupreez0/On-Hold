import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CHANNEL_LABELS, SCAM_LABELS } from '@/fixtures';
import { colors, space } from '@/theme';
import type { Channel, ReportInput, ScamType } from '@/types';
import { SuburbPicker } from './SuburbPicker';
import { Button, Chip, Feather, T, TextField } from './ui';

const CHANNELS = Object.keys(CHANNEL_LABELS) as Channel[];
const TYPES = Object.keys(SCAM_LABELS) as ScamType[];

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

type Props = {
  initial: ReportDraft;
  submitLabel: string;
  onSubmit: (input: ReportInput) => Promise<void>;
  busy?: boolean;
};

export function ReportForm({ initial, submitLabel, onSubmit, busy }: Props) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = () => {
    const next = validateReport(draft);
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({
      channel: draft.channel!,
      scamType: draft.scamType!,
      description: draft.description,
      sender: draft.sender || null,
      suburb: draft.suburb!,
    });
  };

  return (
    <>
      <Group label="How did it reach you?" error={errors.channel}>
        {CHANNELS.map((c) => (
          <Chip key={c} label={CHANNEL_LABELS[c]} selected={draft.channel === c} onPress={() => set('channel', c)} />
        ))}
      </Group>

      <Group label="What kind of scam?" error={errors.scamType}>
        {TYPES.map((t) => (
          <Chip key={t} label={SCAM_LABELS[t]} selected={draft.scamType === t} onPress={() => set('scamType', t)} />
        ))}
      </Group>

      <TextField
        label="What happened?"
        hint="What did they say or ask for? Leave out your own personal details."
        value={draft.description}
        onChangeText={(v) => set('description', v)}
        multiline
        maxLength={1000}
        error={errors.description}
      />

      <TextField
        label="Their number or link (optional)"
        hint="Helps others recognise the same scam."
        value={draft.sender}
        onChangeText={(v) => set('sender', v)}
        autoCapitalize="none"
        error={errors.sender}
      />

      <SuburbPicker value={draft.suburb} onChange={(s) => set('suburb', s)} error={errors.suburb} />

      <View style={styles.note}>
        <Feather name="shield" size={20} color={colors.ink} />
        <T v="small" style={{ flex: 1 }}>
          A moderator checks every report before it appears on the map, so innocent numbers aren’t shamed.
        </T>
      </View>

      <Button label={submitLabel} onPress={submit} loading={busy} />
    </>
  );
}

function Group({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }} role="radiogroup" accessibilityLabel={label}>
      <T v="label">{label}</T>
      <View style={styles.wrap}>{children}</View>
      {error && (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={16} color={colors.stop} />
          <T v="small" color={colors.stop}>
            {error}
          </T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start', backgroundColor: colors.grey, borderRadius: 16, padding: space.md },
});
