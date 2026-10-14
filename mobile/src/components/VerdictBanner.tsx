import { StyleSheet, View } from 'react-native';

import { radius, space, verdictStyle } from '@/theme';
import type { Verdict } from '@/types';
import { Feather, T } from './ui';

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
  banner: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
