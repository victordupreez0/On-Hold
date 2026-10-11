import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Circulating } from '@/components/Circulating';
import { Card, Feather, Screen, Section, T } from '@/components/ui';
import { CHANNEL_ICONS, EXPLAINERS } from '@/fixtures';
import { colors, radius, space } from '@/theme';

export default function Learn() {
  return (
    <Screen edges={['top']}>
      <View style={{ gap: space.xs }}>
        <T v="title" role="heading">
          Know the tricks
        </T>
        <T color={colors.inkSoft}>Scammers reuse the same few tricks. Once you’ve seen them, they’re much easier to spot.</T>
      </View>

      <Circulating />

      <Section title="Common scams in South Africa">
        {EXPLAINERS.map((e) => (
          <Card key={e.slug} onPress={() => router.push(`/learn/${e.slug}`)} accessibilityLabel={`${e.title}. ${e.summary}`} style={styles.row}>
            <View style={styles.icon}>
              <Feather name={CHANNEL_ICONS[e.example.channel]} size={22} color={colors.ink} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label">{e.title}</T>
              <T v="small" color={colors.inkSoft}>
                {e.summary}
              </T>
            </View>
            <Feather name="chevron-right" size={22} color={colors.ink} />
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md - 4,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
