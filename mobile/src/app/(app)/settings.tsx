import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Feather, Header, Screen, T, Toggle } from '@/components/ui';
import { useSession, useUser } from '@/session';
import { colors, minTouch, space } from '@/theme';

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouch }}>
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
