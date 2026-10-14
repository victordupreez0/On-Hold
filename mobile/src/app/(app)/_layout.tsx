import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Feather, T, type IconName } from '@/components/ui';
import { useSession } from '@/session';
import { colors, font, minTouch, radius, space } from '@/theme';

const TABS: Record<string, { label: string; icon: IconName }> = {
  '(home)': { label: 'Home', icon: 'home' },
  map: { label: 'Map', icon: 'map' },
  check: { label: 'Check', icon: 'pause' },
  learn: { label: 'Learn', icon: 'book-open' },
  family: { label: 'Family', icon: 'users' },
};

/** Every signed-in screen lives inside a tab's own stack, so the bar never disappears (HIG persistent-nav). */
export default function AppTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="check" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="family" />
    </Tabs>
  );
}

function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  // useSession, not useUser: the bar can render once more while signing out.
  const { user } = useSession();
  // No bar in simple mode, but keep its bottom inset so footers don't sit on the home indicator.
  if (user?.simpleMode) return <View style={{ height: insets.bottom, backgroundColor: colors.white }} />;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <View style={styles.row} role="tablist">
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const isCheck = route.name === 'check';
          // Emitting tabPress lets a focused tab's stack pop back to its root, like native tab bars.
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (focused || event.defaultPrevented) return;
            navigation.navigate(route.name, route.params);
            // The centre button always means "check something new", never "back to that old verdict".
            if (isCheck && route.state?.key && route.state.index) navigation.dispatch({ type: 'POP_TO_TOP', target: route.state.key });
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={isCheck ? 'Check something' : meta.label}
              style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: 0.96 }] }]}>
              {isCheck ? (
                <View style={[styles.hold, focused && styles.holdOn]}>
                  <View style={[styles.holdBar, focused && { backgroundColor: colors.ink }]} />
                  <View style={[styles.holdBar, focused && { backgroundColor: colors.ink }]} />
                </View>
              ) : (
                <View style={[styles.iconWrap, focused && styles.iconOn]}>
                  <Feather name={meta.icon} size={22} color={focused ? colors.ink : colors.inkSoft} />
                </View>
              )}
              <T
                v="small"
                color={focused ? colors.ink : colors.inkSoft}
                style={{ fontSize: 14, lineHeight: 17, fontFamily: focused ? font.semibold : font.regular }}>
                {meta.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: space.sm,
  },
  // Same max width as Screen, so the bar lines up with content on a wide web window.
  row: { flexDirection: 'row', alignItems: 'flex-end', width: '100%', maxWidth: 560, alignSelf: 'center' },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: minTouch },
  iconWrap: { width: 56, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.highlighter },
  hold: {
    width: 62,
    height: 62,
    marginTop: -28,
    borderRadius: 31,
    backgroundColor: colors.ink,
    borderWidth: 4,
    borderColor: colors.white,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdOn: { backgroundColor: colors.highlighter, borderColor: colors.ink },
  holdBar: { width: 6, height: 20, borderRadius: 3, backgroundColor: colors.highlighter },
});
