import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, radius, space } from '@/theme';
import { T } from './ui';

const HEIGHT = 120;
const BAR_GAP = 4;

/** A plain SVG bar chart -- react-native-svg is already a dependency, so this
 * skips adding a charting library for one chart. */
export function TrendChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barWidth = data.length ? 100 / data.length - BAR_GAP / 10 : 0;

  return (
    <View style={{ gap: space.sm }}>
      <T v="label">{label}</T>
      <View
        accessibilityLabel={`${label}: ${data.map((d) => `${d.date} ${d.count}`).join(', ')}`}
        style={{ height: HEIGHT, borderRadius: radius.md, backgroundColor: colors.grey, padding: space.sm, overflow: 'hidden' }}>
        <Svg width="100%" height="100%" viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none">
          {data.map((d, i) => {
            const h = Math.max((d.count / max) * (HEIGHT - 8), d.count > 0 ? 3 : 1);
            return (
              <Rect
                key={d.date}
                x={i * (100 / data.length) + BAR_GAP / 4}
                y={HEIGHT - h}
                width={barWidth}
                height={h}
                rx={1.5}
                fill={d.count > 0 ? colors.ink : colors.line}
              />
            );
          })}
        </Svg>
      </View>
      {data.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="small" color={colors.inkSoft}>
            {shortDate(data[0].date)}
          </T>
          <T v="small" color={colors.inkSoft}>
            {shortDate(data[data.length - 1].date)}
          </T>
        </View>
      )}
    </View>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
