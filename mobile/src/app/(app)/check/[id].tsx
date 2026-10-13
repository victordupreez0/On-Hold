import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Button, ErrorState, Feather, Header, Loading, Screen, Section, T, TextField } from '@/components/ui';
import { VerdictBanner } from '@/components/VerdictBanner';
import { useUser } from '@/session';
import { colors, minTouch, radius, space } from '@/theme';
import { useToast } from '@/toast';
import type { ChatTurn, CheckResult } from '@/types';
import { useLoad } from '@/useLoad';

export default function VerdictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const check = useLoad(() => api.getCheck(id), id);

  return (
    <Screen>
      <Header />
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
  const [showWhy, setShowWhy] = useState(false);
  const risky = check.verdict !== 'safe';

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

  const done = () => {
    // Leave the Check tab fresh for next time, then go home.
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };

  return (
    <>
      <VerdictBanner verdict={check.verdict} headline={check.headline} />

      {check.sayThis && (
        <View style={styles.sayThis}>
          <T v="overline" color={colors.highlighter}>
            Say this, then hang up
          </T>
          <T v="title" color={colors.white} style={{ fontSize: 25, lineHeight: 32 }}>
            “{check.sayThis}”
          </T>
        </View>
      )}

      <Section title="Do this now">
        <View style={{ gap: space.md }}>
          {check.nextSteps.map((step, i) => (
            <View key={step} style={styles.step}>
              <View style={styles.num}>
                <T v="label">{i + 1}</T>
              </View>
              <T style={{ flex: 1 }}>{step}</T>
            </View>
          ))}
        </View>
      </Section>

      <View style={styles.why}>
        <Pressable
          onPress={() => setShowWhy((s) => !s)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showWhy }}
          accessibilityLabel="Why we think this"
          style={styles.whyHead}>
          <Feather name="search" size={20} color={colors.ink} />
          <T v="label" style={{ flex: 1 }}>
            Why we think this
          </T>
          <Feather name={showWhy ? 'chevron-up' : 'chevron-down'} size={22} color={colors.inkSoft} />
        </Pressable>
        {showWhy && (
          <View style={styles.whyBody}>
            {check.reasons.map((reason) => (
              <View key={reason} style={styles.reason}>
                <View style={styles.dot} />
                <T style={{ flex: 1 }}>{reason}</T>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: space.sm + 2 }}>
        <Button label="Done" variant="dark" onPress={done} />
        {risky && (
          <View style={{ flexDirection: 'row', gap: space.sm + 2 }}>
            {user.role !== 'guardian' && (
              <Button label="Tell family" icon="users" variant="ghost" loading={sending} onPress={tellFamily} style={{ flex: 1, paddingHorizontal: space.sm }} />
            )}
            <Button
              label="Report it"
              icon="flag"
              variant="ghost"
              accessibilityHint="Warn people in your area"
              style={{ flex: 1, paddingHorizontal: space.sm }}
              onPress={() =>
                router.push({
                  pathname: '/check/report',
                  params: { checkId: check.id, scamType: check.scamType ?? 'other', channel: check.kind === 'call' ? 'call' : 'sms' },
                })
              }
            />
          </View>
        )}
      </View>

      <AskFollowUp checkId={check.id} />

      <T v="small" color={colors.inkSoft} style={{ textAlign: 'center' }}>
        On Hold can make mistakes. If something still feels wrong, trust that feeling.
      </T>
    </>
  );
}

/** A short, human follow-up chat grounded in this verdict. Nothing here is saved -- it lives only
 * as long as this screen is open, same as the message you checked never was. */
function AskFollowUp({ checkId }: { checkId: string }) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    const text = question.trim();
    if (!text || busy) return;
    setQuestion('');
    setError(null);
    const history = [...messages, { role: 'user', content: text } satisfies ChatTurn];
    setMessages(history);
    setBusy(true);
    try {
      const answer = await api.askAboutCheck(checkId, text, messages);
      setMessages([...history, { role: 'assistant', content: answer }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Still wondering something?">
      {messages.length > 0 && (
        <View style={{ gap: space.sm }}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              <T color={m.role === 'user' ? colors.white : colors.ink}>{m.content}</T>
            </View>
          ))}
        </View>
      )}
      {busy && (
        <View style={[styles.bubble, styles.bubbleAssistant]}>
          <T color={colors.inkSoft}>Thinking…</T>
        </View>
      )}
      <TextField
        label="Ask a follow-up question"
        placeholder="E.g. “What if they call again?”"
        value={question}
        onChangeText={setQuestion}
        onSubmitEditing={ask}
        error={error}
        returnKeyType="send"
      />
      <Button label="Ask" icon="send" variant="ghost" loading={busy} disabled={!question.trim()} onPress={ask} />
    </Section>
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
  why: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  whyHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4, minHeight: minTouch + 12, paddingHorizontal: space.md },
  whyBody: { paddingHorizontal: space.md, paddingBottom: space.md, gap: space.sm + 2 },
  reason: { flexDirection: 'row', gap: space.sm + 4, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink, marginTop: 9, marginLeft: 6 },
  bubble: { borderRadius: radius.lg, padding: space.sm + 4, maxWidth: '88%' },
  bubbleUser: { backgroundColor: colors.ink, alignSelf: 'flex-end' },
  bubbleAssistant: { backgroundColor: colors.grey, alignSelf: 'flex-start' },
});
