import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { EXPLAINERS, SCAM_LABELS } from '@/fixtures';
import { colors, radius, space } from '@/theme';
import { useLoad } from '@/useLoad';
import { Card, Feather, Section, T, timeAgo } from './ui';

/** "Circulating now": the scams most reported in the last two weeks, nearest first. */
export function Circulating({ limit = 4 }: { limit?: number }) {
  const rows = useLoad(api.listCirculating);
  if (!rows.data?.length) return null;

  return (
    <Section title="Circulating now">
      <T v="small" color={colors.inkSoft} style={{ marginTop: -space.sm }}>
        Reported by people in South Africa over the last two weeks.
      </T>
      {rows.data.slice(0, limit).map((row) => {
        const guide = EXPLAINERS.find((e) => e.scamType === row.scamType);
        const label = SCAM_LABELS[row.scamType];
        return (
          <Card
            key={row.scamType}
            onPress={guide ? () => router.push(`/learn/${guide.slug}`) : undefined}
            accessibilityLabel={`${label}: ${row.count} reports${row.nearYou ? `, ${row.nearYou} near you` : ''}. Learn how to spot it`}
            style={styles.card}>
            <View style={[styles.badge, row.nearYou > 0 && styles.badgeNear]}>
              <T v="label" color={row.nearYou > 0 ? colors.highlighter : colors.ink}>
                {row.count}
              </T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label">{label}</T>
              <T v="small" color={colors.inkSoft}>
                {row.nearYou > 0 ? `${row.nearYou} near you · ` : ''}latest {timeAgo(row.latestAt)}
              </T>
            </View>
            {guide && <Feather name="chevron-right" size={22} color={colors.ink} />}
          </Card>
        );
      })}
    </Section>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md - 4,
    backgroundColor: colors.highlighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNear: { backgroundColor: colors.ink },
});
