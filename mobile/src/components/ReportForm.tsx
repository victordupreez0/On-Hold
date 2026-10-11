import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CHANNEL_LABELS, SCAM_LABELS, SUBURBS } from '@/fixtures';
import { colors, space } from '@/theme';
import type { Channel, ReportInput, ScamType } from '@/types';
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
  else if (len > 500) e.description = 'Please keep it under 500 characters.';
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
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);

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

  const q = search.trim().toLowerCase();
  const suburbs = SUBURBS.filter((s) => !q || `${s.name} ${s.city}`.toLowerCase().includes(q));

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
        maxLength={500}
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

      {draft.suburb && !picking ? (
        // Already know the area: one row to confirm or change, instead of a wall of suburbs.
        <View style={{ gap: space.xs + 2 }}>
          <T v="label">Your area</T>
          <View style={styles.area}>
            <Feather name="map-pin" size={20} color={colors.ink} />
            <T v="label" style={{ flex: 1 }}>
              {draft.suburb}
            </T>
            <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Change area" style={styles.change}>
              <T v="label" style={{ textDecorationLine: 'underline' }}>
                Change
              </T>
            </Pressable>
          </View>
          <T v="small" color={colors.inkSoft}>
            Only the suburb is shown on the map, never your address or name.
          </T>
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <TextField
            label="Your area"
            hint="Only the suburb is shown on the map, never your address or name."
            value={search}
            onChangeText={setSearch}
            placeholder="Search suburbs"
            error={errors.suburb}
          />
          <View style={styles.wrap} role="radiogroup">
            {suburbs.slice(0, q ? 12 : 6).map((s) => (
              <Chip
                key={s.name}
                label={s.name}
                selected={draft.suburb === s.name}
                onPress={() => {
                  set('suburb', s.name);
                  setPicking(false);
                  setSearch('');
                }}
              />
            ))}
            {!suburbs.length && (
              <T v="small" color={colors.inkSoft}>
                No suburb matches “{search}”.
              </T>
            )}
          </View>
        </View>
      )}

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
  area: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, minHeight: 56, paddingLeft: space.md, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line },
  change: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start', backgroundColor: colors.grey, borderRadius: 16, padding: space.md },
});
