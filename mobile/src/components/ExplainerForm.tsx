import { useState } from 'react';
import { View } from 'react-native';

import { CHANNEL_LABELS, SCAM_LABELS } from '@/fixtures';
import { space } from '@/theme';
import type { Channel, Explainer, ScamType } from '@/types';
import { Button, Chip, T, TextField } from './ui';

const CHANNELS = Object.keys(CHANNEL_LABELS) as Channel[];
const TYPES = Object.keys(SCAM_LABELS) as ScamType[];

export type ExplainerDraft = Omit<Explainer, 'id'>;

const linesToList = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export function ExplainerForm({ initial, submitLabel, onSubmit, busy }: { initial: ExplainerDraft; submitLabel: string; onSubmit: (d: ExplainerDraft) => void; busy?: boolean }) {
  const [d, setD] = useState(initial);
  // Raw text while typing: splitting/trimming on every keystroke ate spaces and new lines as they were typed.
  const [playbook, setPlaybook] = useState(initial.playbook.join('\n'));
  const [signs, setSigns] = useState(initial.signs.join('\n'));
  const [whatToDo, setWhatToDo] = useState(initial.whatToDo.join('\n'));
  const set = <K extends keyof ExplainerDraft>(key: K, value: ExplainerDraft[K]) => setD((p) => ({ ...p, [key]: value }));

  return (
    <View style={{ gap: space.lg }}>
      <TextField label="Slug" hint="Lowercase, hyphens only -- used in the Learn URL." value={d.slug} onChangeText={(v) => set('slug', v)} autoCapitalize="none" />

      <View style={{ gap: space.sm }} role="radiogroup" accessibilityLabel="Scam type">
        <T v="label">Scam type</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {TYPES.map((t) => (
            <Chip key={t} label={SCAM_LABELS[t]} selected={d.scamType === t} onPress={() => set('scamType', t)} />
          ))}
        </View>
      </View>

      <TextField label="Title" value={d.title} onChangeText={(v) => set('title', v)} />
      <TextField label="Summary" multiline value={d.summary} onChangeText={(v) => set('summary', v)} />

      <View style={{ gap: space.sm }} role="radiogroup" accessibilityLabel="Example channel">
        <T v="label">Example channel</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {CHANNELS.map((c) => (
            <Chip key={c} label={CHANNEL_LABELS[c]} selected={d.example.channel === c} onPress={() => set('example', { ...d.example, channel: c })} />
          ))}
        </View>
      </View>
      <TextField label="Example text" multiline value={d.example.text} onChangeText={(v) => set('example', { ...d.example, text: v })} />

      <TextField label="What they’re counting on" hint="The weakness the scammer uses, e.g. “Your love for your family.”" multiline value={d.countingOn} onChangeText={(v) => set('countingOn', v)} />
      <TextField label="How they take your money" hint="Their plan, one step per line. End with where the money goes." multiline value={playbook} onChangeText={setPlaybook} />

      <TextField label="Signs" hint="One per line." multiline value={signs} onChangeText={setSigns} />
      <TextField label="What to do" hint="One per line." multiline value={whatToDo} onChangeText={setWhatToDo} />

      <TextField label="Source name" value={d.source.name} onChangeText={(v) => set('source', { ...d.source, name: v })} />
      <TextField label="Source URL" autoCapitalize="none" value={d.source.url} onChangeText={(v) => set('source', { ...d.source, url: v })} />

      <Button label={submitLabel} loading={busy} onPress={() => onSubmit({ ...d, playbook: linesToList(playbook), signs: linesToList(signs), whatToDo: linesToList(whatToDo) })} />
    </View>
  );
}
