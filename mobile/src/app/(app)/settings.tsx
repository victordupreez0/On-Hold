import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Feather, Header, Screen, T } from '@/components/ui';
import { useSession, useUser } from '@/session';
import { colors, space } from '@/theme';

export default function Settings() {
  const user = useUser();
  const { update, signOut } = useSession();

  return (
    <Screen footer={<Button label="Sign out" variant="ghost" icon="log-out" onPress={signOut} />}>
      <Header title="Settings" />
      <View style={{ gap: space.xs }}>
        <T v="title">{user.name}</T>
        <T color={colors.inkSoft}>{user.email}</T>
      </View>

      <Card>
        <Toggle
          label="Simple mode"
          detail="One big button to check something, and one to call family."
          value={user.simpleMode}
          onChange={(simpleMode) => update({ simpleMode })}
        />
      </Card>

      <Card onPress={() => router.push('/reports')} accessibilityLabel="My reports">
        <View style={styles.toggle}>
          <Feather name="flag" size={22} color={colors.ink} />
          <T v="label" style={{ flex: 1 }}>
            My reports
          </T>
          <Feather name="chevron-right" size={22} color={colors.ink} />
        </View>
      </Card>
    </Screen>
  );
}

function Toggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={detail}
      style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{label}</T>
        <T v="small" color={colors.inkSoft}>
          {detail}
        </T>
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  track: { width: 56, height: 32, borderRadius: 16, backgroundColor: colors.line, padding: 3 },
  trackOn: { backgroundColor: colors.ink },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  knobOn: { backgroundColor: colors.highlighter, transform: [{ translateX: 24 }] },
});
