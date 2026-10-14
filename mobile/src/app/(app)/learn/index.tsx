import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { ErrorState, Feather, ListGroup, ListRow, Loading, PageTitle, Screen, Section, T } from '@/components/ui';
import { CHANNEL_ICONS, SCAM_LABELS } from '@/fixtures';
import { colors, radius, space } from '@/theme';
import type { Explainer, ScamType } from '@/types';
import { useLoad } from '@/useLoad';

export default function Learn() {
  const circulating = useLoad(api.listCirculating);
  const explainers = useLoad(api.listExplainers);
  const [top, ...rest] = circulating.data ?? [];

  const guideFor = (t: ScamType) => explainers.data?.find((e) => e.scamType === t);
  const openGuide = (t: ScamType) => {
    const g = guideFor(t);
    if (g) router.push(`/learn/${g.slug}`);
  };

  return (
    <Screen>
      <PageTitle title="Know the tricks" subtitle="Scammers reuse the same few tricks. Once you’ve seen them, they’re easy to spot." />

      {top && (
        <Pressable
          onPress={() => openGuide(top.scamType)}
          accessibilityRole="button"
          accessibilityLabel={`Going around ${top.nearYou ? 'near you' : 'now'}: ${SCAM_LABELS[top.scamType]}. Learn how to spot it`}
          style={({ pressed }) => [styles.hero, pressed && { transform: [{ scale: 0.98 }] }]}>
          <T v="overline">{top.nearYou ? 'Going around near you' : 'Going around now'}</T>
          <T v="display" style={{ fontSize: 30, lineHeight: 35 }}>
            {SCAM_LABELS[top.scamType]}
          </T>
          <T>
            {top.nearYou ? `${top.nearYou} reports in your area` : `${top.count} reports`} in the last two weeks.
          </T>
          <View style={styles.heroCta}>
            <T v="label" color={colors.white}>
              How to spot it
            </T>
            <Feather name="arrow-right" size={20} color={colors.white} />
          </View>
        </Pressable>
      )}

      {rest.length > 0 && (
        <Section title="Also going around">
          <ListGroup>
            {rest.slice(0, 3).map((c) => (
              <ListRow
                key={c.scamType}
                icon="trending-up"
                title={SCAM_LABELS[c.scamType]}
                subtitle={c.nearYou ? `${c.nearYou} near you · ${c.count} in total` : `${c.count} reports`}
                onPress={guideFor(c.scamType) ? () => openGuide(c.scamType) : undefined}
              />
            ))}
          </ListGroup>
        </Section>
      )}

      <Section title="Common scams in South Africa">
        {explainers.error ? (
          <ErrorState message={explainers.error} onRetry={explainers.reload} />
        ) : !explainers.data ? (
          <Loading />
        ) : (
          <ListGroup>
            {explainers.data.map((e: Explainer) => (
              <ListRow key={e.slug} icon={CHANNEL_ICONS[e.example.channel]} title={e.title} subtitle={e.summary} onPress={() => router.push(`/learn/${e.slug}`)} />
            ))}
          </ListGroup>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.highlighter, borderRadius: radius.xl, padding: space.lg, gap: space.sm },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    marginTop: space.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    minHeight: 48,
  },
});
