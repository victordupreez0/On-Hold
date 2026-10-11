import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Chip, Header, ListGroup, ListRow, Screen, Section, T, Toggle } from '@/components/ui';
import { useSession, useUser } from '@/session';
import { colors, space } from '@/theme';
import type { Role } from '@/types';

const ROLES: { role: Role; label: string }[] = [
  { role: 'protected', label: 'Protected' },
  { role: 'guardian', label: 'Guardian' },
  { role: 'admin', label: 'Admin' },
];

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

      {/* Demo only: lets the milestone demo and usability tests show every role. Removed with Supabase Auth. */}
      <Section title="Preview as (demo)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ROLES.map((r) => (
            <Chip key={r.role} label={r.label} selected={user.role === r.role} onPress={() => update({ role: r.role })} />
          ))}
        </View>
      </Section>

      <Button label="Sign out" variant="ghost" icon="log-out" onPress={signOut} />
    </Screen>
  );
}
