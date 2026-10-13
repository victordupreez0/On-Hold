import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Header, ListGroup, ListRow, Screen, T, Toggle } from '@/components/ui';
import { useSession, useUser } from '@/session';
import { colors, space } from '@/theme';

export default function Settings() {
  const user = useUser();
  const { update, signOut } = useSession();

  return (
    <Screen>
      <Header />
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

      <ListGroup>
        <ListRow icon="flag" title="My reports" subtitle="Scams you’ve reported" onPress={() => router.push('/reports')} />
        {user.role === 'admin' && <ListRow icon="shield" title="Review reports" subtitle="Approve or reject new reports" onPress={() => router.push('/admin')} />}
      </ListGroup>

      <Button label="Sign out" variant="ghost" icon="log-out" onPress={signOut} />
    </Screen>
  );
}
