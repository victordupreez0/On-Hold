import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Button, ErrorState, Feather, Header, Loading, Screen, T } from '@/components/ui';
import { VerdictBanner } from '@/components/VerdictBanner';
import { useUser } from '@/session';
import { colors, radius, space } from '@/theme';
import { useToast } from '@/toast';
import type { CheckResult } from '@/types';
import { useLoad } from '@/useLoad';

const home = () => router.dismissTo('/');

export default function VerdictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const check = useLoad(() => api.getCheck(id), id);

  return (
    <Screen>
      <Header onBack={home} />
      {check.data ? (
        <Result check={check.data} />
      ) : check.error ? (
        <ErrorState message={check.error} onRetry={check.reload} />
      ) : (
        <Loading />
      )}
    </Screen>
  );
}

function Result({ check }: { check: CheckResult }) {
  const user = useUser();
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const tellFamily = async () => {
    setSending(true);
    try {
      const names = await api.alertGuardians(check.id);
      toast(`Sent to ${names.join(' and ')}. They’ll get in touch.`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <VerdictBanner verdict={check.verdict} headline={check.headline} />

      {check.sayThis && (
        <View style={styles.sayThis}>
          <T v="label" color={colors.highlighter}>
            SAY THIS, THEN HANG UP
          </T>
          <T v="title" color={colors.white} style={{ fontSize: 26, lineHeight: 33 }}>
            “{check.sayThis}”
          </T>
        </View>
      )}

      <View style={{ gap: space.sm + 2 }}>
        <T v="heading" role="heading">
          What to do now
        </T>
        {check.nextSteps.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={styles.num}>
              <T v="label">{i + 1}</T>
            </View>
            <T style={{ flex: 1 }}>{step}</T>
          </View>
        ))}
      </View>

      <View style={{ gap: space.sm + 2 }}>
        <T v="heading" role="heading">
          Why
        </T>
        {check.reasons.map((reason) => (
          <View key={reason} style={styles.reason}>
            <Feather name="search" size={20} color={colors.inkSoft} style={{ marginTop: 3 }} />
            <T style={{ flex: 1 }}>{reason}</T>
          </View>
        ))}
      </View>

      <View style={{ gap: space.sm }}>
        {user.role !== 'guardian' && check.verdict !== 'safe' && (
          <Button label="Tell my family" icon="users" variant="secondary" loading={sending} onPress={tellFamily} />
        )}
        {check.verdict !== 'safe' && (
          <Button
            label="Report this scam"
            icon="flag"
            variant="secondary"
            accessibilityHint="Warn people in your area"
            onPress={() =>
              router.push({
                pathname: '/reports/new',
                params: { checkId: check.id, scamType: check.scamType ?? 'other', channel: check.kind === 'call' ? 'call' : 'sms' },
              })
            }
          />
        )}
        <Button label="Done" variant="dark" onPress={home} />
      </View>

      <T v="small" color={colors.inkSoft}>
        On Hold can make mistakes. If something still feels wrong, trust that feeling and ask someone you trust.
      </T>
    </>
  );
}

const styles = StyleSheet.create({
  sayThis: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.lg - 4, gap: space.sm },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.highlighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reason: { flexDirection: 'row', gap: space.sm + 4, alignItems: 'flex-start' },
});
