import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { ScamMap } from '@/components/ScamMap';
import { Button, Chip, ErrorState, Feather, Loading, Screen, T } from '@/components/ui';
import { CHANNEL_LABELS, SCAM_LABELS, SUBURBS } from '@/fixtures';
import { useUser } from '@/session';
import { colors, radius, space } from '@/theme';
import type { Channel, ScamType } from '@/types';
import { useLoad } from '@/useLoad';

const SA = { lat: -29.0, lng: 25.0 };
const TYPES: ScamType[] = ['bank', 'sassa', 'aarto', 'family', 'courier', 'jobs', 'debicheck', 'investment'];
const CHANNELS = Object.keys(CHANNEL_LABELS) as Channel[];

export default function ScamMapScreen() {
  const user = useUser();
  const [scamType, setScamType] = useState<ScamType | undefined>();
  const [channel, setChannel] = useState<Channel | undefined>();
  const [selected, setSelected] = useState<string | null>(null);
  const areas = useLoad(() => api.listAreaStats({ scamType, channel }), `${scamType}|${channel}`);

  const home = SUBURBS.find((s) => s.name === user.suburb);
  const center = home ? { lat: home.lat, lng: home.lng, zoomedIn: true } : { ...SA, zoomedIn: false };
  const total = areas.data?.reduce((n, a) => n + a.count, 0) ?? 0;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: space.xs }}>
        <T v="title" role="heading">
          Scams near you
        </T>
        <T color={colors.inkSoft}>Reported by people nearby and checked by a moderator. An area appears once it has 5 reports.</T>
      </View>

      <View style={{ gap: space.sm }}>
        <FilterRow label="Type">
          <Chip label="All types" selected={!scamType} onPress={() => setScamType(undefined)} />
          {TYPES.map((t) => (
            <Chip key={t} label={SCAM_LABELS[t]} selected={scamType === t} onPress={() => setScamType(t)} />
          ))}
        </FilterRow>
        <FilterRow label="Channel">
          <Chip label="Any way" selected={!channel} onPress={() => setChannel(undefined)} />
          {CHANNELS.map((c) => (
            <Chip key={c} label={CHANNEL_LABELS[c]} selected={channel === c} onPress={() => setChannel(c)} />
          ))}
        </FilterRow>
      </View>

      <ScamMap areas={areas.data ?? []} selected={selected} onSelect={setSelected} center={center} />

      {areas.error ? (
        <ErrorState message={areas.error} onRetry={areas.reload} />
      ) : !areas.data ? (
        <Loading />
      ) : (
        <View style={{ gap: space.sm }}>
          <T v="label" accessibilityLiveRegion="polite">
            {areas.data.length ? `${total} reports in ${areas.data.length} areas` : 'No areas match these filters yet.'}
          </T>
          {areas.data.map((a) => {
            const on = a.name === selected;
            return (
              <Pressable
                key={a.name}
                onPress={() => setSelected(a.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${a.name}, ${a.city}: ${a.count} reports, mostly ${SCAM_LABELS[a.topType]}`}
                style={[styles.area, on && styles.areaOn]}>
                <View style={[styles.count, on && { backgroundColor: colors.ink }]}>
                  <T v="label" color={on ? colors.highlighter : colors.ink}>
                    {a.count}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T v="label">
                    {a.name}
                    {a.name === user.suburb ? ' (your area)' : ''}
                  </T>
                  <T v="small" color={colors.inkSoft}>
                    {a.city} · mostly {SCAM_LABELS[a.topType]}
                  </T>
                </View>
                <Feather name="map-pin" size={20} color={colors.ink} />
              </Pressable>
            );
          })}
        </View>
      )}

      <Button label="Report a scam" icon="flag" variant="secondary" onPress={() => router.push('/reports/new')} />
    </Screen>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel={`${label} filter`}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { gap: space.sm, paddingRight: space.md },
  area: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md - 4,
    borderRadius: radius.md,
    backgroundColor: colors.grey,
    minHeight: 64,
  },
  areaOn: { borderWidth: 2, borderColor: colors.ink },
  count: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.highlighter,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
