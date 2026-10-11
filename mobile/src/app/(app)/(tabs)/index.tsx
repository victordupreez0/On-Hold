import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Logo } from '@/components/Logo';
import { Card, Feather, Screen, Section, T, timeAgo } from '@/components/ui';
import { VerdictPill } from '@/components/VerdictBanner';
import { useUser } from '@/session';
import { colors, minTouch, radius, space, verdictStyle } from '@/theme';
import type { User } from '@/types';
import { useLoad } from '@/useLoad';

export default function Home() {
  const user = useUser();
  return user.simpleMode ? <SimpleHome user={user} /> : <FullHome user={user} />;
}

function TopBar({ user }: { user: User }) {
  return (
    <View style={styles.topBar}>
      <Logo size={30} wordmark />
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel="Settings and profile"
        style={styles.avatar}>
        <T v="label">{user.name.slice(0, 1).toUpperCase()}</T>
      </Pressable>
    </View>
  );
}

function HoldCard() {
  return (
    <View style={styles.holdCard}>
      <Pressable
        onPress={() => router.push('/check')}
        accessibilityRole="button"
        accessibilityLabel="Check something"
        accessibilityHint="Paste a message, share a screenshot or describe a call"
        style={({ pressed }) => [styles.holdMain, pressed && { opacity: 0.85 }]}>
        <Logo size={64} onYellow />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="title" style={{ fontSize: 26, lineHeight: 30 }}>
            Check something
          </T>
          <T color={colors.ink}>A message, a screenshot or a call</T>
        </View>
        <Feather name="arrow-right" size={28} color={colors.ink} />
      </Pressable>
      <Pressable
        onPress={() => router.push({ pathname: '/check', params: { mode: 'call' } })}
        accessibilityRole="button"
        accessibilityLabel="Someone on the phone with you now? Get help during the call"
        style={styles.callRow}>
        <Feather name="phone-call" size={20} color={colors.ink} />
        <T v="label" style={{ flex: 1 }}>
          Someone on the phone with you now?
        </T>
        <Feather name="chevron-right" size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function FullHome({ user }: { user: User }) {
  const checks = useLoad(api.listMyChecks);
  const family = useLoad(api.getFamily);
  const last = checks.data?.[0];

  return (
    <Screen edges={['top']}>
      <TopBar user={user} />
      <View style={{ gap: space.xs }}>
        <T v="title" role="heading">
          Hi {user.name}
        </T>
        <T color={colors.inkSoft}>Something feel off? Check it before you act.</T>
      </View>

      <HoldCard />

      {last && (
        <Section title="Your last check">
          <Card onPress={() => router.push(`/check/${last.id}`)} accessibilityLabel={`Last check: ${verdictStyle[last.verdict].word}. ${last.headline}`}>
            <View style={styles.rowBetween}>
              <VerdictPill verdict={last.verdict} />
              <T v="small" color={colors.inkSoft}>
                {timeAgo(last.createdAt)}
              </T>
            </View>
            <T v="label">{last.headline}</T>
          </Card>
        </Section>
      )}

      {family.data && (
        <Section title="Family">
          <FamilySummary user={user} family={family.data} />
        </Section>
      )}
    </Screen>
  );
}

type Family = Awaited<ReturnType<typeof api.getFamily>>;

function FamilySummary({ user, family }: { user: User; family: Family }) {
  const people = user.role === 'guardian' ? family.lookingAfter : family.lookedAfterBy;
  if (!people.length) {
    return (
      <Card onPress={() => router.push('/family')} accessibilityLabel="Add family">
        <View style={styles.row}>
          <Feather name="user-plus" size={22} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <T v="label">{user.role === 'guardian' ? 'Invite someone you look out for' : 'Add someone you trust'}</T>
            <T v="small" color={colors.inkSoft}>
              They’ll get a heads-up if something looks like a scam. You choose what they see.
            </T>
          </View>
        </View>
      </Card>
    );
  }
  return (
    <Card onPress={() => router.push('/family')} accessibilityLabel="Open family">
      {people.map((l) => {
        const name = user.role === 'guardian' ? l.protectedName : l.guardianName;
        const status =
          l.status === 'pending' ? 'Invite sent' : user.role === 'guardian' ? 'Sharing alerts with you' : 'Looking out for you';
        return (
          <View key={l.id} style={styles.row}>
            <View style={styles.personDot}>
              <T v="label">{name.slice(0, 1)}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="label">{name}</T>
              <T v="small" color={colors.inkSoft}>
                {status}
              </T>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

/** Simple mode: one button to check, one to call family (pitch: "One button for Ouma"). */
function SimpleHome({ user }: { user: User }) {
  const family = useLoad(api.getFamily);
  const helper = family.data?.lookedAfterBy.find((l) => l.status === 'active' && l.guardianPhone);

  return (
    <Screen edges={['top', 'bottom']} style={{ alignItems: 'stretch' }}>
      <View style={styles.rowBetween}>
        <T v="title">Hi {user.name}</T>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" style={styles.avatar}>
          <Feather name="settings" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/check')}
        accessibilityRole="button"
        accessibilityLabel="Check something"
        style={({ pressed }) => [styles.simpleHold, pressed && { opacity: 0.85 }]}>
        <Logo size={150} onYellow />
        <T v="hero" style={{ textAlign: 'center' }}>
          Check something
        </T>
      </Pressable>

      <Pressable
        onPress={() => router.push({ pathname: '/check', params: { mode: 'call' } })}
        accessibilityRole="button"
        accessibilityLabel="Someone is on the phone with me"
        style={styles.simpleButton}>
        <Feather name="phone-call" size={26} color={colors.ink} />
        <T v="heading">Someone is on the phone</T>
      </Pressable>

      {helper && (
        <Pressable
          onPress={() => Linking.openURL(`tel:${helper.guardianPhone}`)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${helper.guardianName}`}
          style={[styles.simpleButton, { backgroundColor: colors.ink }]}>
          <Feather name="phone" size={26} color={colors.white} />
          <T v="heading" color={colors.white}>
            Call {helper.guardianName}
          </T>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdCard: { backgroundColor: colors.highlighter, borderRadius: 28, overflow: 'hidden' },
  holdMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg - 4, minHeight: 120 },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    minHeight: 56,
    paddingHorizontal: space.lg - 4,
    borderTopWidth: 2,
    borderTopColor: colors.highlighterDeep,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  personDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.highlighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleHold: {
    flex: 1,
    minHeight: 320,
    borderRadius: 36,
    backgroundColor: colors.highlighter,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.lg,
  },
  simpleButton: {
    minHeight: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.grey,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
});
