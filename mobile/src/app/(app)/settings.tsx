import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Chip, Feather, Header, Screen, T, Toggle, type IconName } from '@/components/ui';
import { useSession, useUser } from '@/session';
import { colors, minTouch, space } from '@/theme';
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

      <Card>
        <LinkRow icon="flag" label="My reports" href="/reports" />
        {user.role === 'admin' && <LinkRow icon="shield" label="Review reports" href="/admin" />}
      </Card>

      {/* Demo only: lets the milestone demo and usability tests show every role. Removed with Supabase Auth. */}
      <Card>
        <T v="label">Preview as (demo)</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ROLES.map((r) => (
            <Chip key={r.role} label={r.label} selected={user.role === r.role} onPress={() => update({ role: r.role })} />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function LinkRow({ icon, label, href }: { icon: IconName; label: string; href: Href }) {
  return (
    <Card onPress={() => router.push(href)} accessibilityLabel={label} style={{ padding: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouch }}>
        <Feather name={icon} size={22} color={colors.ink} />
        <T v="label" style={{ flex: 1 }}>
          {label}
        </T>
        <Feather name="chevron-right" size={22} color={colors.ink} />
      </View>
    </Card>
  );
}
