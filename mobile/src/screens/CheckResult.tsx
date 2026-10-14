import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { Logo } from '@/components/Logo';
import { Button, ErrorState, Feather, Header, Loading, Screen, Section, T } from '@/components/ui';
import { VerdictBanner } from '@/components/VerdictBanner';
import { useUser } from '@/session';
import { colors, minTouch, radius, space } from '@/theme';
import { useToast } from '@/toast';
import type { CheckResult as Check } from '@/types';
import { useLoad } from '@/useLoad';

/** The verdict for one check. Routed from both the Check tab (right after checking) and
 * Home's history, so links below stay inside whichever tab you came from. */
export default function CheckResult() {
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

function Result({ check }: { check: Check }) {
  const user = useUser();
  const toast = useToast();
  const fromHistory = usePathname().startsWith('/history');
  const [sending, setSending] = useState(false);
  const [told, setTold] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const risky = check.verdict !== 'safe';

  const tellFamily = async () => {
    setSending(true);
    try {
      const names = await api.alertGuardians(check.id);
      setTold(true); // one tap, one alert -- a second tap used to send it again
      toast(`Sent to ${names.join(' and ')}. They’ll get in touch.`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const done = () => {
    // Leave the stack fresh for next time, then go home.
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };

  const remove = async () => {
    const ok = await confirm('Delete this check?', 'It and any questions you asked about it will be gone for good.', 'Delete', true);
    if (!ok) return;
    try {
      await api.deleteCheck(check.id);
      toast('Deleted.');
      if (router.canGoBack()) router.back();
      else router.navigate('/');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const report = () => {
    const params = { checkId: check.id, scamType: check.scamType ?? 'other', channel: check.kind === 'call' ? 'call' : 'sms' };
    router.push(fromHistory ? { pathname: '/reports/new', params } : { pathname: '/check/report', params });
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

      <ChatEntry checkId={check.id} fromHistory={fromHistory} />

      <View style={{ gap: space.sm + 2 }}>
        <Button label="Done" variant="dark" onPress={done} />
        {risky && (
          <View style={{ flexDirection: 'row', gap: space.sm + 2 }}>
            {user.role !== 'guardian' && (
              <Button
                label={told ? 'Family told' : 'Tell family'}
                icon={told ? 'check' : 'users'}
                variant="ghost"
                loading={sending}
                disabled={told}
                onPress={tellFamily}
                style={{ flex: 1, paddingHorizontal: space.sm }}
              />
            )}
            <Button label="Report it" icon="flag" variant="ghost" accessibilityHint="Warn people in your area" style={{ flex: 1, paddingHorizontal: space.sm }} onPress={report} />
          </View>
        )}
      </View>

      <T v="small" color={colors.inkSoft} style={{ textAlign: 'center' }}>
        On Hold can make mistakes. If something still feels wrong, trust that feeling.
      </T>
      <Pressable onPress={remove} accessibilityRole="button" style={styles.delete}>
        <T v="small" color={colors.inkSoft} style={{ textDecorationLine: 'underline' }}>
          Delete this check
        </T>
      </Pressable>
    </>
  );
}

/** The way into the follow-up chat; previews the last answer once there is one. */
function ChatEntry({ checkId, fromHistory }: { checkId: string; fromHistory: boolean }) {
  const messages = useLoad(() => api.listCheckMessages(checkId), checkId);
  const last = messages.data?.findLast((m) => m.role === 'assistant');
  const open = () =>
    router.push(fromHistory ? { pathname: '/history/[id]/chat', params: { id: checkId } } : { pathname: '/check/[id]/chat', params: { id: checkId } });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={last ? 'Continue your chat about this' : 'Ask On Hold a question about this'}
      style={({ pressed }) => [styles.chat, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={styles.chatAvatar}>
        <Logo size={30} onYellow />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{last ? 'Your chat about this' : 'Still wondering something?'}</T>
        <T v="small" color={colors.inkSoft} numberOfLines={2}>
          {last ? last.content : 'Ask On Hold anything about this, like “What if they call again?”'}
        </T>
      </View>
      <Feather name="message-circle" size={22} color={colors.ink} />
    </Pressable>
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
  chat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 76,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.grey,
  },
  delete: { minHeight: minTouch, alignItems: 'center', justifyContent: 'center', marginTop: -space.md },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.highlighter, alignItems: 'center', justifyContent: 'center' },
});
