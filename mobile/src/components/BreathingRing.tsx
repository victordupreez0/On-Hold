import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';
import { arcPath, GAP_END, GAP_START } from './Logo';

const SWEEP = GAP_START + 360 - GAP_END;

type Props = { size?: number; durationMs?: number };

/** The logo ring, filling over `durationMs` while it gently breathes. Same ring as the brand mark. */
export function BreathingRing({ size = 220, durationMs = 3000 }: Props) {
  const [t, setT] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      setT(Date.now() - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const p = Math.min(t / durationMs, 1);
  const eased = 1 - Math.pow(1 - p, 3);
  const scale = reduceMotion ? 1 : 1 + 0.035 * Math.sin((t / 4000) * Math.PI * 2);
  const fill = Math.max(eased * SWEEP, 0.5);

  return (
    <View aria-hidden style={{ transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={arcPath(50, 50, 44, GAP_END, GAP_START + 360)} stroke={colors.highlighterDeep} strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path d={arcPath(50, 50, 32, GAP_END, GAP_START + 360)} stroke={colors.line} strokeWidth={9} strokeLinecap="round" fill="none" />
        <Path d={arcPath(50, 50, 32, GAP_END, GAP_END + fill)} stroke={colors.ink} strokeWidth={9} strokeLinecap="round" fill="none" />
        <Rect x={40.5} y={38} width={7} height={24} rx={3.5} fill={colors.ink} />
        <Rect x={52.5} y={38} width={7} height={24} rx={3.5} fill={colors.ink} />
      </Svg>
    </View>
  );
}
