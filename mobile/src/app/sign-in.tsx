import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api';
import { Button, Card, Chip, Header, Screen, T, TextField, TextLink } from '@/components/ui';
import { useSession } from '@/session';
import { colors, space } from '@/theme';

// Demo accounts for the milestone demo and usability tests; removed when Supabase Auth lands.
const DEMO = [
  { label: 'Marie (protected)', email: 'marie@onhold.test' },
  { label: 'Pieter (guardian)', email: 'pieter@onhold.test' },
  { label: 'Lerato (admin)', email: 'admin@onhold.test' },
];

export default function SignIn() {
  const { setUser } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError(null);
    try {
      setUser(await api.signIn({ email, password }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label="Sign in" onPress={submit} loading={busy} />}>
      <Header />
      <T v="title" role="heading">
        Welcome back
      </T>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={submit}
        error={error}
      />
      <TextLink label="New here? Create an account" onPress={() => router.replace('/sign-up')} />

      <Card>
        <T v="label">Demo accounts</T>
        <T v="small" color={colors.inkSoft}>
          Pick one, then use any password of 8 or more characters.
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {DEMO.map((d) => (
            <Chip key={d.email} label={d.label} selected={email === d.email} onPress={() => setEmail(d.email)} />
          ))}
        </View>
      </Card>
    </Screen>
  );
}
