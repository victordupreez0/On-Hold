import { StyleSheet, View } from 'react-native';

import { radius, space, verdictStyle } from '@/theme';
import type { Verdict } from '@/types';
import { Feather, T } from './ui';

/** Small verdict marker: always an icon and a word, never colour alone. */
export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const v = verdictStyle[verdict];
  return (
    <View style={[styles.pill, { backgroundColor: v.bg }]} accessibilityLabel={`Verdict: ${v.word}`}>
      <Feather name={v.icon} size={15} color={v.fg} />
      <T v="small" color={v.fg} style={{ fontFamily: 'AtkinsonHyperlegibleNext_600SemiBold' }}>
        {v.word}
      </T>
    </View>
  );
}

/** Full-width verdict header for the result screen. */
export function VerdictBanner({ verdict, headline }: { verdict: Verdict; headline: string }) {
  const v = verdictStyle[verdict];
  return (
    <View style={[styles.banner, { backgroundColor: v.bg }]} accessibilityRole="header" accessibilityLiveRegion="assertive">
      <View style={styles.wordRow}>
        <Feather name={v.icon} size={40} color={v.fg} />
        <T v="hero" color={v.fg} style={{ fontSize: 44, lineHeight: 48 }}>
          {v.word}
        </T>
      </View>
      <T v="heading" color={v.fg} style={{ fontSize: 23, lineHeight: 30, fontFamily: 'AtkinsonHyperlegibleNext_800ExtraBold' }}>
        {headline}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  banner: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
