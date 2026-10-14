import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SuburbPicker } from '@/components/SuburbPicker';
import { Button, Card, Header, ListGroup, ListRow, Screen, T, TextField, Toggle } from '@/components/ui';
import { useSession, useUser } from '@/session';
import { colors, space } from '@/theme';
import { useToast } from '@/toast';

export default function Settings() {
  const user = useUser();
  const { update, signOut } = useSession();
  const toast = useToast();
  const [phone, setPhone] = useState(user.phone ?? '');

  const save = async (patch: Parameters<typeof update>[0]) => {
    try {
      await update(patch);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const savePhone = () => {
    const trimmed = phone.trim();
    if (trimmed !== (user.phone ?? '')) save({ phone: trimmed || null });
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
          onChangeText={setPhone}
          onBlur={savePhone}
          onSubmitEditing={savePhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <SuburbPicker value={user.suburb} onChange={(suburb) => save({ suburb })} />
      </Card>

      <ListGroup>
        <ListRow icon="flag" title="My reports" subtitle="Scams you’ve reported" onPress={() => router.push('/reports')} />
        {user.role === 'admin' && <ListRow icon="shield" title="Review reports" subtitle="Approve or reject new reports" onPress={() => router.push('/admin')} />}
      </ListGroup>

      <Button label="Sign out" variant="ghost" icon="log-out" onPress={signOut} />
    </Screen>
  );
}
