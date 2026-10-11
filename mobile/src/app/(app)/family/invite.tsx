import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Button, Feather, Header, Screen, T, TextField } from '@/components/ui';
import { useUser } from '@/session';
import { colors, radius, space } from '@/theme';
import { useToast } from '@/toast';

// SA cellphone numbers: 0XX XXX XXXX or +27 XX XXX XXXX.
const CELL = /^(\+27|0)[6-8]\d{8}$/;

export default function Invite() {
  const user = useUser();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{ code: string; url: string } | null>(null);

  const create = async () => {
    const next = {
      name: name.trim() ? undefined : 'Who are you inviting?',
      phone: CELL.test(phone.replace(/\s/g, '')) ? undefined : 'Enter a South African cellphone number, like 082 123 4567.',
    };
    setErrors(next);
    if (next.name || next.phone) return;
    setBusy(true);
    try {
      setInvite(await api.createInvite({ name, phone }));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const message = invite
    ? `Hi ${name.trim()}, it’s ${user.name}. I’ve set up On Hold so I can help if a scam message or call ever comes your way. You choose what I see. Open this link to accept: ${invite.url}  (or enter code ${invite.code})`
    : '';

  const share = async () => {
    try {
      await Share.share({ message });
    } catch {
      await Clipboard.setStringAsync(message);
      toast('Invite copied. Paste it into WhatsApp or an SMS.');
    }
  };

  if (invite) {
    return (
      <Screen footer={<Button label="Done" variant="ghost" onPress={() => router.back()} />}>
        <Header />
        <View style={{ gap: space.sm }}>
          <T v="title" role="heading">
            Invite ready
          </T>
          <T color={colors.inkSoft}>Send it to {name.trim()} on WhatsApp or SMS. Nothing is shared until they accept and choose what you can see.</T>
        </View>
        <View style={styles.code} accessibilityLabel={`Invite code ${invite.code.split('').join(' ')}`}>
          <T v="small">Invite code</T>
          <T v="hero" style={{ letterSpacing: 4 }}>
            {invite.code}
          </T>
        </View>
        <Button label="Share invite" icon="share-2" onPress={share} />
        <Button
          label="Copy invite"
          icon="copy"
          variant="secondary"
          onPress={async () => {
            await Clipboard.setStringAsync(message);
            toast('Invite copied.');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label="Create invite" icon="user-plus" onPress={create} loading={busy} />}>
      <Header title="Invite someone" />
      <T color={colors.inkSoft}>Invite a parent or relative you want to look out for. They’ll see exactly what they’re agreeing to before anything is shared.</T>
      <TextField label="Their first name" value={name} onChangeText={setName} autoComplete="off" error={errors.name} />
      <TextField
        label="Their cellphone number"
        hint="Used only to label the invite. We don’t message them."
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={errors.phone}
      />
      <View style={styles.note}>
        <Feather name="lock" size={20} color={colors.ink} />
        <T v="small" style={{ flex: 1 }}>
          You’ll only ever see warnings they choose to share, never their messages.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { backgroundColor: colors.highlighter, borderRadius: radius.lg, padding: space.lg, alignItems: 'center', gap: space.xs },
  note: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start', backgroundColor: colors.grey, borderRadius: radius.md, padding: space.md },
});
