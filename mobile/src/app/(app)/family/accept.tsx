import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Button, Card, Feather, Header, Screen, T, TextField, Toggle, type IconName } from '@/components/ui';
import { colors, radius, space } from '@/theme';
import { useToast } from '@/toast';

const NEVER: [IconName, string][] = [
  ['message-square', 'Your messages or what you check'],
  ['users', 'Your contacts or who calls you'],
  ['credit-card', 'Your banking or money'],
];

export default function AcceptInvite() {
  const params = useLocalSearchParams<{ code?: string }>();
  const toast = useToast();
  const [code, setCode] = useState(params.code ?? '');
  const [invite, setInvite] = useState<{ guardianName: string; code: string } | null>(null);
  const [shareVerdicts, setShareVerdicts] = useState(true);
  const [shareCalls, setShareCalls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const find = async () => {
    if (code.trim().length < 4) return setError('Enter the code from your invite.');
    setBusy(true);
    setError(null);
    try {
      setInvite(await api.getInvite(code));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!invite) return;
    setBusy(true);
    try {
      await api.acceptInvite(invite.code, { shareCalls, shareVerdicts });
      toast(`${invite.guardianName} is now looking out for you.`);
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!invite) {
    return (
      <Screen footer={<Button label="Find invite" onPress={find} loading={busy} />}>
        <Header title="Accept an invite" />
        <T color={colors.inkSoft}>Enter the code someone sent you on WhatsApp or SMS.</T>
        <TextField
          label="Invite code"
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          error={error}
          onSubmitEditing={find}
          style={{ letterSpacing: 4, fontSize: 24 }}
        />
      </Screen>
    );
  }

  const name = invite.guardianName;
  return (
    <Screen footer={<Button label={`Yes, let ${name} look out for me`} onPress={accept} loading={busy} />}>
      <Header onBack={() => setInvite(null)} />
      <T v="title" role="heading">
        {name} wants to look out for you
      </T>
      <T color={colors.inkSoft}>Choose what {name} can see. You can change this or stop any time.</T>

      <Card>
        <Toggle
          label="Tell them when I get a Stop"
          detail="They see the warning, never your messages."
          value={shareVerdicts}
          onChange={setShareVerdicts}
        />
        <Toggle label="Tell them when I check a call" detail="So they can phone you while it’s happening." value={shareCalls} onChange={setShareCalls} />
      </Card>

      <View style={styles.never}>
        <T v="label">{name} will never see:</T>
        {NEVER.map(([icon, line]) => (
          <View key={line} style={styles.row}>
            <Feather name={icon} size={20} color={colors.ink} />
            <T style={{ flex: 1 }}>{line}</T>
          </View>
        ))}
      </View>

      <Button label="Not now" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  never: { backgroundColor: colors.grey, borderRadius: radius.lg, padding: space.md + 2, gap: space.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
});
