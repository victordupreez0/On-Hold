import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Feather, T, type IconName } from '@/components/ui';
import { useUser } from '@/session';
import { colors, minTouch, radius, space } from '@/theme';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  map: { label: 'Map', icon: 'map-pin' },
  learn: { label: 'Learn', icon: 'book-open' },
  family: { label: 'Family', icon: 'users' },
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="family" />
    </Tabs>
  );
}

/** Four tabs with the Hold button in the middle (pitch wireframe). Hidden in Simple mode. */
function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const user = useUser();
  if (user.simpleMode) return null;

  const tab = (route: (typeof state.routes)[number], index: number) => {
    const meta = TABS[route.name];
    const focused = state.index === index;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}>
        <View style={[styles.iconWrap, focused && styles.iconOn]}>
          <Feather name={meta.icon} size={22} color={focused ? colors.ink : colors.inkSoft} />
        </View>
        <T v="small" color={focused ? colors.ink : colors.inkSoft} style={{ fontSize: 13, lineHeight: 16 }}>
          {meta.label}
        </T>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]} role="tablist">
      {state.routes.slice(0, 2).map((r, i) => tab(r, i))}
      <Pressable
        onPress={() => router.push('/check')}
        accessibilityRole="button"
        accessibilityLabel="Check something"
        accessibilityHint="Check a message, screenshot or call"
        style={styles.tab}>
        <View style={styles.hold}>
          <View style={styles.bar1} />
          <View style={styles.bar1} />
        </View>
        <T v="small" style={{ fontSize: 13, lineHeight: 16, fontFamily: 'AtkinsonHyperlegibleNext_600SemiBold' }}>
          Check
        </T>
      </Pressable>
      {state.routes.slice(2).map((r, i) => tab(r, i + 2))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: minTouch },
  iconWrap: { width: 52, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.highlighter },
  hold: {
    width: 60,
    height: 60,
    marginTop: -26,
    borderRadius: 30,
    backgroundColor: colors.highlighter,
    borderWidth: 4,
    borderColor: colors.ink,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar1: { width: 6, height: 20, borderRadius: 3, backgroundColor: colors.ink },
});
