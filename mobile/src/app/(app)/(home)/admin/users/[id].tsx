import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { Button, Chip, ErrorState, Header, Loading, Screen, T } from '@/components/ui';
import { useUser } from '@/session';
import { colors, space } from '@/theme';
import { useToast } from '@/toast';
import type { Role } from '@/types';
import { useLoad } from '@/useLoad';

const ROLES: { role: Role; label: string }[] = [
  { role: 'protected', label: 'Protected' },
  { role: 'guardian', label: 'Guardian' },
  { role: 'admin', label: 'Admin' },
];

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useUser();
  const target = useLoad(() => api.getUser(id), id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const self = id === me.id;

  const setRole = async (role: Role) => {
    setBusy(true);
    try {
      await api.updateUserRole(id, role);
      toast('Role updated.');
      target.reload();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm(`Delete ${target.data?.name}'s account?`, 'This removes their account, checks, reports and family links. It can’t be undone.', 'Delete account', true);
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteUser(id);
      toast('Account deleted.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  const u = target.data;
  return (
    <Screen>
      <Header title={u?.name ?? 'User'} />
      {target.error ? (
        <ErrorState message={target.error} onRetry={target.reload} />
      ) : !u ? (
        <Loading />
      ) : (
        <>
          <View style={{ gap: space.xs }}>
            <T color={colors.inkSoft}>{u.email}</T>
            {u.phone && <T color={colors.inkSoft}>{u.phone}</T>}
            {u.suburb && <T color={colors.inkSoft}>{u.suburb}</T>}
          </View>

          <View style={{ gap: space.sm }}>
            <T v="label">Role</T>
            {self && (
              <T v="small" color={colors.inkSoft}>
                You can’t change your own role.
              </T>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} role="radiogroup">
              {ROLES.map((r) => (
                <Chip key={r.role} label={r.label} selected={u.role === r.role} onPress={self || busy ? () => {} : () => setRole(r.role)} />
              ))}
            </View>
          </View>

          {!self && <Button label="Delete account" variant="danger" icon="trash-2" loading={busy} onPress={remove} />}
        </>
      )}
    </Screen>
  );
}
