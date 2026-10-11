import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Button, ErrorState, Feather, Header, Loading, Screen, T } from '@/components/ui';
import { VerdictBanner } from '@/components/VerdictBanner';
import { useUser } from '@/session';
import { colors, radius, space, verdictStyle } from '@/theme';
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

function speakable(c: CheckResult) {
  return [
    `${verdictStyle[c.verdict].word}. ${c.headline}`,
    c.sayThis && `You can say: ${c.sayThis}`,
    `Why: ${c.reasons.join(' ')}`,
    `What to do now: ${c.nextSteps.join(' ')}`,
  ]
    .filter(Boolean)
    .join(' ');
}

function Result({ check }: { check: CheckResult }) {
  const user = useUser();
  const toast = useToast();
  const [speaking, setSpeaking] = useState(false);
  const [sending, setSending] = useState(false);

  const speak = () => {
    Speech.stop();
    Speech.speak(speakable(check), {
      language: 'en-ZA',
      rate: 0.95,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setSpeaking(false);
  };

  useEffect(() => {
    if (user.readAloud || user.simpleMode) speak();
    return () => {
      Speech.stop();
    };
    // Speak once when the verdict opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check.id]);

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
        <Button
          label={speaking ? 'Stop reading' : 'Read this aloud'}
          icon={speaking ? 'volume-x' : 'volume-2'}
          variant="secondary"
          onPress={speaking ? stopSpeaking : speak}
        />
        {user.role !== 'guardian' && check.verdict !== 'safe' && (
          <Button label="Tell my family" icon="users" variant="secondary" loading={sending} onPress={tellFamily} />
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
