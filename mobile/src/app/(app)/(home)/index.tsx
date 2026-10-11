import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api';
import { Logo } from '@/components/Logo';
import { Feather, ListGroup, ListRow, Screen, Section, T, timeAgo } from '@/components/ui';
import { EXPLAINERS, SCAM_LABELS } from '@/fixtures';
import { useUser } from '@/session';
import { colors, minTouch, radius, space, verdictStyle } from '@/theme';
import type { User } from '@/types';
import { useLoad } from '@/useLoad';

const openCheck = (mode?: 'call') => router.navigate(mode ? { pathname: '/check', params: { mode } } : '/check');

export default function Home() {
  const user = useUser();
  return user.simpleMode ? <SimpleHome user={user} /> : <FullHome user={user} />;
}

/** One bold brand block with the one thing to do. Everything else is quiet. */
function Hero({ user }: { user: User }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space.md }]}>
      <View style={styles.heroTop}>
        <Logo size={28} onYellow wordmark />
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings and profile"
          style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}>
          <T v="label">{user.name.slice(0, 1).toUpperCase()}</T>
        </Pressable>
      </View>

      <View style={{ gap: space.xs }}>
        <T v="display" role="heading">
          Hi {user.name}
        </T>
        <T>Something feel off? Check it before you act.</T>
      </View>

      <Pressable
        onPress={() => openCheck()}
        accessibilityRole="button"
        accessibilityLabel="Check something"
        accessibilityHint="Paste a message, share a screenshot or describe a call"
        style={({ pressed }) => [styles.checkButton, pressed && { transform: [{ scale: 0.98 }] }]}>
        <View style={styles.pauseIcon}>
          <View style={styles.pauseBar} />
          <View style={styles.pauseBar} />
        </View>
        <T v="heading" color={colors.white} style={{ flex: 1, fontFamily: 'AtkinsonHyperlegibleNext_800ExtraBold' }}>
          Check something
        </T>
        <Feather name="arrow-right" size={24} color={colors.white} />
      </Pressable>

      <Pressable
        onPress={() => openCheck('call')}
        accessibilityRole="button"
        accessibilityLabel="Someone on the phone with you right now? Get help during the call"
        style={({ pressed }) => [styles.callLink, pressed && { opacity: 0.6 }]}>
        <Feather name="phone-call" size={20} color={colors.ink} />
        <T v="label" style={{ textDecorationLine: 'underline' }}>
          Someone on the phone right now?
        </T>
      </Pressable>
    </View>
  );
}

function FullHome({ user }: { user: User }) {
  const checks = useLoad(api.listMyChecks);
  const family = useLoad(api.getFamily);
  const circulating = useLoad(api.listCirculating);
  const pending = useLoad(() => (user.role === 'admin' ? api.listPendingReports() : Promise.resolve([])), user.role);

  const last = checks.data?.[0];
  const near = circulating.data?.[0];
  const nearGuide = near && EXPLAINERS.find((e) => e.scamType === near.scamType);

  return (
    <Screen edges={[]} style={{ paddingTop: 0 }}>
      <Hero user={user} />

      <Section title="Today">
        <ListGroup>
          {!!pending.data?.length && (
            <ListRow
              icon="shield"
              iconBg={colors.highlighter}
              title={`${pending.data.length} ${pending.data.length === 1 ? 'report' : 'reports'} to review`}
              subtitle="Approve real scams so they warn people nearby"
              onPress={() => router.push('/admin')}
            />
          )}
          {last && (
            <ListRow
              icon={verdictStyle[last.verdict].icon}
              iconBg={verdictStyle[last.verdict].bg}
              iconColor={verdictStyle[last.verdict].fg}
              title={last.headline}
              subtitle={`Your last check · ${verdictStyle[last.verdict].word} · ${timeAgo(last.createdAt)}`}
              onPress={() => router.navigate(`/check/${last.id}`)}
            />
          )}
          {family.data && <FamilyRow user={user} family={family.data} />}
          {near && (
            <ListRow
              icon="trending-up"
              title={`Going around: ${SCAM_LABELS[near.scamType]}`}
              subtitle={near.nearYou ? `${near.nearYou} reports near you this fortnight` : `${near.count} reports this fortnight`}
              onPress={() => (nearGuide ? router.navigate(`/learn/${nearGuide.slug}`) : router.navigate('/learn'))}
            />
          )}
        </ListGroup>
      </Section>
    </Screen>
  );
}

type Family = Awaited<ReturnType<typeof api.getFamily>>;

function FamilyRow({ user, family }: { user: User; family: Family }) {
  const guardian = user.role === 'guardian';
  const people = (guardian ? family.lookingAfter : family.lookedAfterBy).filter((l) => l.status === 'active');
  if (!people.length) {
    return (
      <ListRow
        icon="user-plus"
        title={guardian ? 'Invite someone you look out for' : 'Add someone you trust'}
        subtitle={guardian ? 'Get a heads-up when they might be getting scammed' : 'They get a heads-up if something looks like a scam'}
        onPress={() => router.navigate('/family')}
      />
    );
  }
  const names = people.map((l) => (guardian ? l.protectedName : l.guardianName)).join(' and ');
  return (
    <ListRow
      icon="heart"
      title={guardian ? `You look out for ${names}` : `${names} ${people.length > 1 ? 'are' : 'is'} looking out for you`}
      subtitle={guardian ? 'See alerts and status' : 'You choose what they see'}
      onPress={() => router.navigate('/family')}
    />
  );
}

/** Simple mode: one button to check, one to call family (pitch: "One button for Ouma"). */
function SimpleHome({ user }: { user: User }) {
  const family = useLoad(api.getFamily);
  const helper = family.data?.lookedAfterBy.find((l) => l.status === 'active' && l.guardianPhone);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.simpleTop}>
        <T v="title">Hi {user.name}</T>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" style={styles.settingsButton}>
          <Feather name="settings" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => openCheck()}
        accessibilityRole="button"
        accessibilityLabel="Check something"
        style={({ pressed }) => [styles.simpleHold, pressed && { transform: [{ scale: 0.98 }] }]}>
        <Logo size={150} onYellow />
        <T v="hero" style={{ textAlign: 'center' }}>
          Check something
        </T>
      </Pressable>

      <Pressable onPress={() => openCheck('call')} accessibilityRole="button" accessibilityLabel="Someone is on the phone with me" style={styles.simpleButton}>
        <Feather name="phone-call" size={26} color={colors.ink} />
        <T v="heading">Someone is on the phone</T>
      </Pressable>

      {helper && (
        <Pressable
          onPress={() => Linking.openURL(`tel:${helper.guardianPhone}`)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${helper.guardianName}`}
          style={[styles.simpleButton, { backgroundColor: colors.ink, borderColor: colors.ink }]}>
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
  hero: {
    backgroundColor: colors.highlighter,
    marginHorizontal: -(space.lg - 4),
    paddingHorizontal: space.lg - 4,
    paddingBottom: space.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: space.lg,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 72,
    paddingHorizontal: space.lg - 4,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
  },
  pauseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.highlighter,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBar: { width: 5, height: 16, borderRadius: 3, backgroundColor: colors.ink },
  callLink: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: minTouch, alignSelf: 'flex-start', marginTop: -space.sm },
  simpleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsButton: {
    width: minTouch,
    height: minTouch,
    borderRadius: minTouch / 2,
    backgroundColor: colors.grey,
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
    borderWidth: 1.5,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
});
