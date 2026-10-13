import { useState } from 'react';
import { View } from 'react-native';

import { space } from '@/theme';
import type { Suburb } from '@/types';
import { Button, TextField } from './ui';

export function SuburbForm({
  initial,
  editingName,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial: Suburb;
  /** Renaming isn't supported server-side (the name is the primary key) -- lock the field when editing. */
  editingName: boolean;
  submitLabel: string;
  onSubmit: (s: Suburb) => void;
  busy?: boolean;
}) {
  const [d, setD] = useState({ ...initial, lat: String(initial.lat), lng: String(initial.lng) });

  const submit = () => {
    const lat = Number(d.lat);
    const lng = Number(d.lng);
    onSubmit({ name: d.name.trim(), city: d.city.trim(), lat, lng });
  };

  const valid = d.name.trim() && d.city.trim() && Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng));

  return (
    <View style={{ gap: space.lg }}>
      <TextField label="Name" value={d.name} onChangeText={(v) => setD((p) => ({ ...p, name: v }))} editable={!editingName} />
      <TextField label="City" value={d.city} onChangeText={(v) => setD((p) => ({ ...p, city: v }))} />
      <TextField label="Latitude" keyboardType="numeric" value={d.lat} onChangeText={(v) => setD((p) => ({ ...p, lat: v }))} />
      <TextField label="Longitude" keyboardType="numeric" value={d.lng} onChangeText={(v) => setD((p) => ({ ...p, lng: v }))} />
      <Button label={submitLabel} loading={busy} disabled={!valid} onPress={submit} />
    </View>
  );
}
