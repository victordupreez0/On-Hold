import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api';
import { SuburbPicker } from '@/components/SuburbPicker';
import { Button, Card, Chip, Header, Screen, T, TextField } from '@/components/ui';
import { ROLE_PILL } from '@/fixtures';
import { colors, space } from '@/theme';
import { useToast } from '@/toast';
import type { Role } from '@/types';

/** For someone who can't sign up themselves. They get a one-time password to pass on. */
export default function NewUser() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('protected');
  const [suburb, setSuburb] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string; id: string } | null>(null);

  const save = async () => {
    const found = {
      name: name.trim() ? undefined : 'Enter their name.',
      email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) ? undefined : 'Enter a valid email address.',
    };
    setErrors(found);
    if (found.name || found.email) return;
    setBusy(true);
    try {
      const res = await api.createUser({ name: name.trim(), email: email.trim(), role, suburb });
      setCreated({ name: res.user.name, email: res.user.email, password: res.tempPassword, id: res.user.id });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Screen>
        <Header title="Account created" />
        <Card>
          <T>
            {created.name} can sign in now with <T v="label">{created.email}</T> and this one-time password:
          </T>
          <T v="title" selectable style={{ letterSpacing: 1 }}>
            {created.password}
          </T>
          <T v="small" color={colors.inkSoft}>
            It’s shown only once. Pass it on in person or by phone, not in a group chat.
          </T>
        </Card>
        <Button
          label="Copy password"
          icon="copy"
          variant="secondary"
          onPress={async () => {
            await Clipboard.setStringAsync(created.password);
            toast('Password copied.');
          }}
        />
        <Button label="See their page" icon="user" onPress={() => router.replace(`/admin/users/${created.id}`)} />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label="Create account" icon="user-plus" loading={busy} onPress={save} />}>
      <Header title="Add a person" />
      <TextField label="Name" value={name} onChangeText={setName} error={errors.name} autoComplete="off" />
      <TextField label="Email" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="off" />
      <View style={{ gap: space.sm }}>
        <T v="label">Role</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} role="radiogroup">
          {(Object.keys(ROLE_PILL) as Role[]).map((r) => (
            <Chip key={r} label={ROLE_PILL[r].label} selected={role === r} onPress={() => setRole(r)} />
          ))}
        </View>
      </View>
      <SuburbPicker label="Their area (optional)" value={suburb} onChange={setSuburb} />
    </Screen>
  );
}
