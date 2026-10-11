import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Button, Feather, Header, Screen, T, TextField, TextLink, type IconName } from '@/components/ui';
import { useSession } from '@/session';
import { colors, radius, space } from '@/theme';
import type { Role } from '@/types';

const WHO: { role: Role; title: string; body: string; icon: IconName }[] = [
  { role: 'protected', title: 'For me', body: 'I want to check messages and calls before I act.', icon: 'user' },
  { role: 'guardian', title: 'I’m looking out for someone', body: 'Get alerts when a parent or relative might be getting scammed.', icon: 'users' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUp() {
  const { setUser } = useSession();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = {
      role: role ? null : 'Choose who On Hold is for.',
      name: name.trim() ? null : 'Please enter your first name.',
      email: EMAIL.test(email.trim()) ? null : 'Please enter a valid email address.',
      password: password.length >= 8 ? null : 'Use at least 8 characters.',
    };
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean) || !role) return;
    setBusy(true);
    try {
      setUser(await api.signUp({ name, email, password, role }));
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button label="Create account" onPress={submit} loading={busy} />}>
      <Header />
      <T v="title" role="heading">
        Create your account
      </T>

      <View style={{ gap: space.sm }} role="radiogroup" accessibilityLabel="Who is On Hold for?">
        <T v="label">Who is On Hold for?</T>
        {WHO.map((w) => {
          const on = role === w.role;
          return (
            <Pressable
              key={w.role}
              onPress={() => setRole(w.role)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${w.title}. ${w.body}`}
              style={[styles.option, on && styles.optionOn]}>
              <View style={[styles.optionIcon, on && { backgroundColor: colors.ink }]}>
                <Feather name={w.icon} size={22} color={on ? colors.highlighter : colors.ink} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="label">{w.title}</T>
                <T v="small" color={colors.inkSoft}>
                  {w.body}
                </T>
              </View>
              <Feather name={on ? 'check-circle' : 'circle'} size={22} color={colors.ink} />
            </Pressable>
          );
        })}
        {errors.role && (
          <T v="small" color={colors.stop}>
            {errors.role}
          </T>
        )}
      </View>

      <TextField label="First name" value={name} onChangeText={setName} autoComplete="given-name" error={errors.name} />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={errors.email}
      />
      <TextField
        label="Password"
        hint="At least 8 characters."
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        error={errors.password}
        onSubmitEditing={submit}
      />
      {formError && <T color={colors.stop}>{formError}</T>}
      <TextLink label="Already have an account? Sign in" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.line,
  },
  optionOn: { borderColor: colors.ink, backgroundColor: colors.highlighter },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
