import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SUBURBS } from '@/fixtures';
import { colors, space } from '@/theme';
import { Chip, Feather, T, TextField } from './ui';

/** Search-and-pick suburb field, shared by the report form and the profile.
 * Never asks for anything more precise than a suburb. */
export function SuburbPicker({ value, onChange, error }: { value: string | null; onChange: (suburb: string) => void; error?: string }) {
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(!value);

  if (value && !picking) {
    return (
      <View style={{ gap: space.xs + 2 }}>
        <T v="label">Your area</T>
        <View style={styles.area}>
          <Feather name="map-pin" size={20} color={colors.ink} />
          <T v="label" style={{ flex: 1 }}>
            {value}
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
    );
  }

  const q = search.trim().toLowerCase();
  const suburbs = SUBURBS.filter((s) => !q || `${s.name} ${s.city}`.toLowerCase().includes(q));

  return (
    <View style={{ gap: space.sm }}>
      <TextField
        label="Your area"
        hint="Only the suburb is shown on the map, never your address or name."
        value={search}
        onChangeText={setSearch}
        placeholder="Search suburbs"
        error={error}
      />
      <View style={styles.wrap} role="radiogroup">
        {suburbs.slice(0, q ? 12 : 6).map((s) => (
          <Chip
            key={s.name}
            label={s.name}
            selected={value === s.name}
            onPress={() => {
              onChange(s.name);
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
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  area: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, minHeight: 56, paddingLeft: space.md, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line },
  change: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.md },
});
