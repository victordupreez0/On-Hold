import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Header, Screen, T } from '@/components/ui';
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
        <View style={styles.divider} />
        <Toggle
          label="Read answers aloud"
          detail="Hear every verdict spoken out loud."
          value={user.readAloud}
          onChange={(readAloud) => update({ readAloud })}
        />
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
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.xs },
  track: { width: 56, height: 32, borderRadius: 16, backgroundColor: colors.line, padding: 3 },
  trackOn: { backgroundColor: colors.ink },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  knobOn: { backgroundColor: colors.highlighter, transform: [{ translateX: 24 }] },
});
