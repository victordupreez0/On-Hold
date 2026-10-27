import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import * as api from '@/api';
import { Button, Card, Chip, ErrorState, Header, Loading, Pill, Screen, T, TextField, timeAgo } from '@/components/ui';
import { ROLE_PILL } from '@/fixtures';
import { colors, space } from '@/theme';
import type { Role } from '@/types';
import { useLoad } from '@/useLoad';

const PAGE = 50;

/** Everyone, most recently active first. */
export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | undefined>();
  const [limit, setLimit] = useState(PAGE);
  const users = useLoad(() => api.listUsers({ search: search.trim() || undefined, role, limit }), `${search}-${role}-${limit}`);

  return (
    <Screen wide footer={<Button label="Add a person" icon="user-plus" onPress={() => router.push('/admin/users/new')} />}>
      <Header title="Users" />
      <TextField label="Search" placeholder="Name or email" value={search} onChangeText={setSearch} autoCapitalize="none" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.md }}>
        <Chip label="Everyone" selected={!role} onPress={() => setRole(undefined)} />
        {(Object.keys(ROLE_PILL) as Role[]).map((r) => (
          <Chip key={r} label={ROLE_PILL[r].label} selected={role === r} onPress={() => setRole(r)} />
        ))}
      </ScrollView>

      {users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : !users.data ? (
        <Loading />
      ) : !users.data.length ? (
        <T color={colors.inkSoft}>No users match that search.</T>
      ) : (
        <>
          {users.data.map((u) => (
            <Card key={u.id} onPress={() => router.push(`/admin/users/${u.id}`)} accessibilityLabel={`${u.name}, ${ROLE_PILL[u.role].label}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
                <T v="label" style={{ flex: 1 }}>
                  {u.name}
                </T>
                <Pill label={ROLE_PILL[u.role].label} bg={ROLE_PILL[u.role].bg} />
              </View>
              <T v="small" color={colors.inkSoft}>
                {u.email}
                {u.suburb ? ` · ${u.suburb}` : ''}
              </T>
              <T v="small" color={colors.inkSoft}>
                {u.lastSeenAt ? `Active ${timeAgo(u.lastSeenAt)}` : 'Not active yet'} · joined {timeAgo(u.createdAt)}
              </T>
            </Card>
          ))}
          {users.data.length === limit && limit < 200 && <Button label="Show more" variant="secondary" icon="chevron-down" onPress={() => setLimit(limit + PAGE)} />}
        </>
      )}
    </Screen>
  );
}
