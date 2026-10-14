import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { SuburbPicker } from '@/components/SuburbPicker';
import { Button, Card, Header, ListGroup, ListRow, Screen, T, TextField, Toggle } from '@/components/ui';
import { useSession, useUser } from '@/session';
import { isSaCell } from '@/phone';
import { colors, minTouch, space } from '@/theme';
import { useToast } from '@/toast';

export default function Settings() {
  const user = useUser();
  const { update, signOut } = useSession();
  const toast = useToast();
  const [phone, setPhone] = useState(user.phone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneChanged = phone.trim() !== (user.phone ?? '');

  const save = async (patch: Parameters<typeof update>[0], saved?: string) => {
    try {
      await update(patch);
      if (saved) toast(saved);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  // An explicit Save: the phone keypad has no Return key, and saving silently on blur lost numbers on Back.
  const savePhone = () => {
    const trimmed = phone.trim();
    if (trimmed && !isSaCell(trimmed)) return setPhoneError('Enter a South African cellphone number, like 082 123 4567.');
    setPhoneError(null);
    save({ phone: trimmed || null }, trimmed ? 'Number saved.' : 'Number removed.');
  };

  const deleteAccount = async () => {
    const ok = await confirm(
      'Delete your account?',
      'This removes your account, everything you’ve checked and asked, your reports and your family links. It can’t be undone.',
      'Delete my account',
      true,
    );
    if (!ok) return;
    try {
      await api.deleteMe();
      await signOut();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <Screen>
      <Header />
      <View style={{ gap: space.xs }}>
        <T v="title">{user.name}</T>
        <T color={colors.inkSoft}>{user.email}</T>
      </View>

      {/* Simple mode hides alerts and the tab bar -- it's for the person being protected. Still shown if already on, so it can be turned off. */}
      {(user.role === 'protected' || user.simpleMode) && (
        <Card>
          <Toggle
            label="Simple mode"
            detail="One big button to check something, and one to call family."
            value={user.simpleMode}
            onChange={(simpleMode) => save({ simpleMode })}
          />
        </Card>
      )}

      <Card>
        <T v="label">Your details</T>
        <T v="small" color={colors.inkSoft}>
          Your area powers the map and “going around near you”. Your number lets family call you back with one tap.
        </T>
        <TextField
          label="Phone number"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setPhoneError(null);
          }}
          onSubmitEditing={savePhone}
          error={phoneError}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        {phoneChanged && <Button label="Save number" variant="secondary" onPress={savePhone} />}
        <SuburbPicker value={user.suburb} onChange={(suburb) => save({ suburb }, 'Area saved.')} />
      </Card>

      <ListGroup>
        <ListRow icon="flag" title="My reports" subtitle="Scams you’ve reported" onPress={() => router.push('/reports')} />
        {user.role === 'admin' && <ListRow icon="shield" title="Review reports" subtitle="Approve or reject new reports" onPress={() => router.push('/admin/reports')} />}
      </ListGroup>

      <Button label="Sign out" variant="ghost" icon="log-out" onPress={signOut} />
      <Pressable onPress={deleteAccount} accessibilityRole="button" style={{ minHeight: minTouch, alignItems: 'center', justifyContent: 'center' }}>
        <T v="label" color={colors.stop}>
          Delete my account
        </T>
      </Pressable>
    </Screen>
  );
}
