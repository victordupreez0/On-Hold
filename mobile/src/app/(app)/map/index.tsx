import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { ScamMap } from '@/components/ScamMap';
import { Button, Chip, ChipRow, ErrorState, Feather, Loading, PageTitle, Screen, Section, T } from '@/components/ui';
import { SCAM_LABELS } from '@/fixtures';
import { useUser } from '@/session';
import { colors, heat, heatRgba, minTouch, radius, space } from '@/theme';
import type { AreaStat, Explainer, ScamType } from '@/types';
import { useLoad } from '@/useLoad';

const SA = { lat: -29.0, lng: 25.0 };
const lower = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s[0].toLowerCase() + s.slice(1));
const TYPES: ScamType[] = ['aarto', 'bank', 'sassa', 'sars', 'family', 'courier', 'jobs', 'debicheck', 'investment'];

export default function ScamMapScreen() {
  const user = useUser();
  const [scamType, setScamType] = useState<ScamType | undefined>();
  const [selected, setSelected] = useState<string | null>(null);
  const areas = useLoad(() => api.listAreaStats({ scamType }), scamType ?? 'all');
  const suburbs = useLoad(api.listSuburbs);
  const explainers = useLoad(api.listExplainers);

  const home = suburbs.data?.find((s) => s.name === user.suburb);
  const center = home ? { lat: home.lat, lng: home.lng, zoomedIn: true } : { ...SA, zoomedIn: false };
  const max = Math.max(1, ...(areas.data ?? []).map((a) => a.count));
  const focus = areas.data?.find((a) => a.name === selected);

  return (
    <Screen>
      <PageTitle title="Scams near you" subtitle="Where people are reporting scams right now." />

      <ChipRow accessibilityLabel="Filter by type of scam">
        <Chip label="All scams" selected={!scamType} onPress={() => setScamType(undefined)} />
        {TYPES.map((t) => (
          <Chip key={t} label={SCAM_LABELS[t]} selected={scamType === t} onPress={() => setScamType(t)} />
        ))}
      </ChipRow>

      <View>
        {suburbs.data || suburbs.error ? (
          <ScamMap key={home?.name ?? 'sa'} areas={areas.data ?? []} selected={selected} onSelect={setSelected} center={center} />
        ) : (
          <View style={styles.mapPlaceholder} />
        )}
        <View style={styles.legend} accessibilityLabel="Legend: lighter means fewer reports, deeper orange means more">
          <T v="small" style={styles.legendText}>
            Fewer
          </T>
          <View style={styles.ramp}>
            {heat.map((c) => (
              <View key={c} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
          <T v="small" style={styles.legendText}>
            More
          </T>
        </View>
      </View>

      {focus && <FocusCard area={focus} explainers={explainers.data ?? []} onClose={() => setSelected(null)} />}

      {areas.error ? (
        <ErrorState message={areas.error} onRetry={areas.reload} />
      ) : !areas.data ? (
        <Loading />
      ) : (
        <Section title={areas.data.length ? 'Most reports' : 'No reports yet'}>
          <View style={styles.list}>
            {areas.data.map((a) => (
              <AreaRow key={a.name} area={a} max={max} mine={a.name === user.suburb} selected={a.name === selected} onPress={() => setSelected(a.name)} />
            ))}
          </View>
          <View style={styles.note}>
            <Feather name="lock" size={16} color={colors.inkSoft} />
            <T v="small" color={colors.inkSoft} style={{ flex: 1 }}>
              Shown by suburb only, never exact addresses. Every report is checked before it appears.
            </T>
          </View>
        </Section>
      )}

      <Button label="Report a scam" icon="flag" variant="ghost" onPress={() => router.push('/map/report')} />
    </Screen>
  );
}

function AreaRow({ area, max, mine, selected, onPress }: { area: AreaStat; max: number; mine: boolean; selected: boolean; onPress: () => void }) {
  const t = area.count / max;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${area.name}${mine ? ', your area' : ''}: ${area.count} ${area.count === 1 ? 'report' : 'reports'}, mostly ${SCAM_LABELS[area.topType]}`}
      style={({ pressed }) => [styles.row, selected && styles.rowOn, pressed && { backgroundColor: colors.grey }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.rowTop}>
          <T v="label" style={{ flex: 1 }}>
            {area.name}
            {mine ? <T v="small" color={colors.inkSoft}>{'  · your area'}</T> : null}
          </T>
          <T v="label">{area.count}</T>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(t * 100, 6)}%`, backgroundColor: heatRgba(t, 1) }]} />
        </View>
        <T v="small" color={colors.inkSoft}>
          Mostly {lower(SCAM_LABELS[area.topType])}
        </T>
      </View>
    </Pressable>
  );
}

function FocusCard({ area, explainers, onClose }: { area: AreaStat; explainers: Explainer[]; onClose: () => void }) {
  const guide = explainers.find((e) => e.scamType === area.topType);
  return (
    <View style={styles.focus} accessibilityLiveRegion="polite">
      <View style={{ flex: 1, gap: 2 }}>
        <T v="heading">{area.name}</T>
        <T v="small" color={colors.inkSoft}>
          {area.count} {area.count === 1 ? 'report' : 'reports'} · mostly {lower(SCAM_LABELS[area.topType])}
        </T>
        {guide && (
          <Pressable onPress={() => router.push({ pathname: '/map/guide/[slug]', params: { slug: guide.slug } })} accessibilityRole="link" style={styles.focusLink}>
            <T v="label" style={{ textDecorationLine: 'underline' }}>
              How to spot it
            </T>
            <Feather name="arrow-right" size={18} color={colors.ink} />
          </Pressable>
        )}
      </View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close area details" style={styles.close}>
        <Feather name="x" size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    position: 'absolute',
    left: space.sm + 4,
    bottom: space.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 4,
    paddingVertical: 6,
    zIndex: 1000,
  },
  legendText: { fontSize: 14, lineHeight: 17 },
  mapPlaceholder: { height: 320, borderRadius: radius.lg, backgroundColor: colors.grey },
  ramp: { width: 72, height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  list: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm + 4, paddingHorizontal: space.sm, borderRadius: radius.md },
  rowOn: { backgroundColor: colors.grey },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.grey, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm },
  focus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.highlighter,
    marginTop: -space.sm,
  },
  focusLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: minTouch, alignSelf: 'flex-start' },
  close: { width: minTouch, height: minTouch, borderRadius: minTouch / 2, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
