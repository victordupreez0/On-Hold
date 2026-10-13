import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api';
import { Card, ErrorState, Header, Loading, Pill, Screen, T, TextField } from '@/components/ui';
import { colors } from '@/theme';
import type { Role } from '@/types';
import { useLoad } from '@/useLoad';

const ROLE_PILL: Record<Role, { label: string; bg: string }> = {
  protected: { label: 'Protected', bg: colors.grey },
  guardian: { label: 'Guardian', bg: colors.highlighter },
  admin: { label: 'Admin', bg: colors.safeTint },
};

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const users = useLoad(() => api.listUsers({ search: search.trim() || undefined, limit: 100 }), search);

  return (
    <Screen wide>
      <Header title="Users" />
      <TextField label="Search" placeholder="Name or email" value={search} onChangeText={setSearch} autoCapitalize="none" />

      {users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : !users.data ? (
        <Loading />
      ) : !users.data.length ? (
        <T color={colors.inkSoft}>No users match that search.</T>
      ) : (
        users.data.map((u) => (
          <Card key={u.id} onPress={() => router.push(`/admin/users/${u.id}`)} accessibilityLabel={`${u.name}, ${ROLE_PILL[u.role].label}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T v="label">{u.name}</T>
              <Pill label={ROLE_PILL[u.role].label} bg={ROLE_PILL[u.role].bg} />
            </View>
            <T v="small" color={colors.inkSoft}>
              {u.email}
              {u.suburb ? ` · ${u.suburb}` : ''}
            </T>
          </Card>
        ))
      )}
    </Screen>
  );
}
