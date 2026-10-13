import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';
import { Feather, T, type IconName } from './ui';

/** A row of KPI cards that wraps at narrow widths instead of squeezing. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function StatTile({ label, value, icon, tint = colors.grey }: { label: string; value: string | number; icon: IconName; tint?: string }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.icon, { backgroundColor: tint }]}>
        <Feather name={icon} size={18} color={colors.ink} />
      </View>
      <T v="display" style={{ fontSize: 28, lineHeight: 32 }}>
        {value}
      </T>
      <T v="small" color={colors.inkSoft}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm + 4 },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
