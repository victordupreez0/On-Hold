import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api';
import type { AdminUserDetail } from '@/api';
import { confirm } from '@/confirm';
import { ActivityList } from '@/components/ActivityList';
import { StatGrid, StatTile } from '@/components/StatTile';
import { SuburbPicker } from '@/components/SuburbPicker';
import { Button, Chip, EmptyState, ErrorState, Header, ListGroup, ListRow, Loading, Pill, Screen, Section, T, TextField, timeAgo } from '@/components/ui';
import { ROLE_PILL, SCAM_LABELS } from '@/fixtures';
import { useUser } from '@/session';
import { colors, space } from '@/theme';
import { useToast } from '@/toast';
import type { Role } from '@/types';
import { useLoad } from '@/useLoad';

const STATUS_WORD = { pending: 'Waiting for review', approved: 'Approved', rejected: 'Rejected' } as const;

/** One person at a glance: who they are, when they were last here, what they've done, who they're linked to. */
export default function AdminUserPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const target = useLoad(() => api.getUser(id), id);
  const reports = useLoad(() => api.listAllReports({ reporterId: id, limit: 20 }), id);

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
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Pill label={ROLE_PILL[u.role].label} bg={ROLE_PILL[u.role].bg} />
              {u.simpleMode && <Pill label="Simple mode" icon="maximize" />}
            </View>
            <T color={colors.inkSoft}>{u.email}</T>
            <T color={colors.inkSoft}>
              Joined {timeAgo(u.createdAt)} · {u.lastSeenAt ? `last active ${timeAgo(u.lastSeenAt)}` : 'not active yet'}
            </T>
          </View>

          <StatGrid>
            <StatTile label="Checks" value={u.checkCount} icon="search" />
            <StatTile label="Stop verdicts" value={u.stopCount} icon="octagon" tint={colors.stopTint} />
            <StatTile label="Reports" value={u.reportCount} icon="flag" />
            <StatTile label="AI calls, 7 days" value={u.aiCalls7Days} icon="zap" tint={colors.highlighter} />
          </StatGrid>

          <Section title="Family">
            {u.family.length ? (
              <ListGroup>
                {u.family.map((f) => (
                  <ListRow
                    key={f.id}
                    icon={f.relation === 'looksAfter' ? 'heart' : 'shield'}
                    title={f.relation === 'looksAfter' ? `Looks after ${f.name}` : `Looked after by ${f.name}`}
                    subtitle={f.status === 'pending' ? `Invited ${timeAgo(f.createdAt)}, not accepted yet` : `Linked ${timeAgo(f.createdAt)}`}
                    onPress={f.personId ? () => router.push(`/admin/users/${f.personId}`) : undefined}
                  />
                ))}
              </ListGroup>
            ) : (
              <T color={colors.inkSoft}>No family links.</T>
            )}
          </Section>

          <Section title="Their reports">
            {reports.data?.length ? (
              <ListGroup>
                {reports.data.map((r) => (
                  <ListRow
                    key={r.id}
                    icon="flag"
                    title={`${SCAM_LABELS[r.scamType]} · ${r.suburb}`}
                    subtitle={`${STATUS_WORD[r.status]} · ${timeAgo(r.createdAt)}`}
                    onPress={() => router.push(`/admin/reports/${r.id}`)}
                  />
                ))}
              </ListGroup>
            ) : (
              <T color={colors.inkSoft}>{reports.data ? 'No reports.' : 'Loading…'}</T>
            )}
          </Section>

          <Section title="What they’ve done">
            {u.activity.length ? (
              <ActivityList items={u.activity} forUserId={u.id} />
            ) : (
              <EmptyState icon="clock" title="Nothing yet" body="They haven’t done anything in the app so far." />
            )}
          </Section>

          <EditUser user={u} onSaved={target.reload} />
        </>
      )}
    </Screen>
  );
}

function EditUser({ user: u, onSaved }: { user: AdminUserDetail; onSaved: () => void }) {
  const me = useUser();
  const toast = useToast();
  const [name, setName] = useState(u.name);
  const [phone, setPhone] = useState(u.phone ?? '');
  const [busy, setBusy] = useState(false);
  const self = u.id === me.id;
  const dirty = name.trim() !== u.name || phone.trim() !== (u.phone ?? '');

  const save = async (changes: Parameters<typeof api.updateUser>[1], message: string) => {
    setBusy(true);
    try {
      await api.updateUser(u.id, changes);
      toast(message);
      onSaved();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm(`Delete ${u.name}'s account?`, 'This removes their account, checks, reports and family links. It can’t be undone.', 'Delete account', true);
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteUser(u.id);
      toast('Account deleted.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Section title="Edit">
      <View style={{ gap: space.md }}>
        <TextField label="Name" value={name} onChangeText={setName} error={name.trim() ? undefined : 'A name is needed.'} />
        <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" hint="Family use this number to call them." />
        <Button label="Save changes" icon="check" variant="dark" loading={busy} disabled={!dirty || !name.trim()} onPress={() => save({ name: name.trim(), phone: phone.trim() || null }, 'Saved.')} />
        <SuburbPicker label="Their area" value={u.suburb} onChange={(suburb) => save({ suburb }, 'Area saved.')} />

        <View style={{ gap: space.sm }}>
          <T v="label">Role</T>
          {self && (
            <T v="small" color={colors.inkSoft}>
              You can’t change your own role.
            </T>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} role="radiogroup">
            {(Object.keys(ROLE_PILL) as Role[]).map((r) => (
              <Chip key={r} label={ROLE_PILL[r].label} selected={u.role === r} onPress={self || busy || u.role === r ? () => {} : () => save({ role: r }, 'Role updated.')} />
            ))}
          </View>
        </View>

        {!self && <Button label="Delete account" variant="danger" icon="trash-2" loading={busy} onPress={remove} />}
      </View>
    </Section>
  );
}
