import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, font } from '@/theme';

// Ring geometry shared with BreathingRing: gap sits at the top-left like the pitch logo.
export const GAP_START = -140;
export const GAP_END = -95;

export function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(fromDeg));
  const y1 = cy + r * Math.sin(rad(fromDeg));
  const x2 = cx + r * Math.cos(rad(toDeg));
  const y2 = cy + r * Math.sin(rad(toDeg));
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const RING = arcPath(50, 50, 30, GAP_END, GAP_START + 360);
const HALO = arcPath(50, 50, 44, GAP_END, GAP_START + 360);

type Props = { size?: number; onYellow?: boolean; wordmark?: boolean };

export function Logo({ size = 40, onYellow = false, wordmark = false }: Props) {
  const mark = (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={HALO} stroke={onYellow ? colors.highlighterDeep : '#D6D6CF'} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path d={RING} stroke={colors.ink} strokeWidth={10} strokeLinecap="round" fill="none" />
      <Rect x={40} y={37} width={7} height={26} rx={3.5} fill={onYellow ? colors.ink : colors.highlighterDeep} />
      <Rect x={53} y={37} width={7} height={26} rx={3.5} fill={onYellow ? colors.ink : colors.highlighterDeep} />
    </Svg>
  );
  if (!wordmark) return mark;
  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel="On Hold">
      {mark}
      <Text style={[styles.word, { fontSize: size * 0.72 }]}>on hold</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { fontFamily: font.bold, color: colors.ink, letterSpacing: -1 },
});
