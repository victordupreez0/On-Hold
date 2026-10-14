import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as api from '@/api';
import { Logo } from '@/components/Logo';
import { ErrorState, Feather, ListGroup, ListRow, Loading, Screen, Section, T, TextLink, timeAgo } from '@/components/ui';
import { SCAM_LABELS } from '@/fixtures';
import { useUser } from '@/session';
import { colors, minTouch, radius, space, verdictStyle } from '@/theme';
import type { CheckResult, Explainer, User } from '@/types';
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

type Tab = 'today' | 'history';

function FullHome({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>('today');
  const checks = useLoad(api.listMyChecks);

  return (
    <Screen edges={[]} style={{ paddingTop: 0 }}>
      <Hero user={user} />
      <Segments value={tab} onChange={setTab} />
      {tab === 'today' ? <Today user={user} checks={checks} onSeeAll={() => setTab('history')} /> : <History checks={checks} />}
    </Screen>
  );
}

function Segments({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={styles.segments} role="tablist">
      {(['today', 'history'] as const).map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === t }}
          style={[styles.segment, value === t && styles.segmentOn]}>
          <T v="label" color={value === t ? colors.ink : colors.inkSoft}>
            {t === 'today' ? 'Today' : 'History'}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  const v = verdictStyle[check.verdict];
  const asked = (check.messageCount ?? 0) / 2; // each question is saved with its answer
  const chat = asked ? ` · ${asked === 1 ? '1 question' : `${asked} questions`}` : '';
  return (
    <ListRow
      icon={v.icon}
      iconBg={v.bg}
      iconColor={v.fg}
      title={check.headline}
      subtitle={`${v.word} · ${check.kind === 'call' ? 'Call' : 'Message'} · ${timeAgo(check.createdAt)}${chat}`}
      onPress={() => router.push({ pathname: '/history/[id]', params: { id: check.id } })}
    />
  );
}

/** What matters right now: your latest checks, one tip, and what's going around. */
type ChecksLoad = { data?: CheckResult[]; error?: string; reload: () => void };

function Today({ user, checks, onSeeAll }: { user: User; checks: ChecksLoad; onSeeAll: () => void }) {
  const family = useLoad(api.getFamily);
  const circulating = useLoad(api.listCirculating);
  const pending = useLoad(() => (user.role === 'admin' ? api.listPendingReports() : Promise.resolve([])), user.role);
  // A guardian's whole reason to open the app: someone they look out for just got a warning.
  const alerts = useLoad(() => (user.role === 'guardian' ? api.listAlerts() : Promise.resolve([])), user.role);
  const explainers = useLoad(api.listExplainers);

  const near = circulating.data?.[0];
  const nearGuide = near && explainers.data?.find((e) => e.scamType === near.scamType);
  const recent = checks.data?.slice(0, 3);
  const fresh = alerts.data?.filter((a) => !a.seen).slice(0, 3) ?? [];

  return (
    <>
      {(!!pending.data?.length || fresh.length > 0) && (
        <Section title="Needs you">
          <ListGroup>
            {fresh.map((a) => (
              <ListRow
                key={a.id}
                icon={a.type === 'stop_verdict' ? 'octagon' : 'bell'}
                iconBg={a.type === 'stop_verdict' ? colors.stop : colors.highlighter}
                iconColor={a.type === 'stop_verdict' ? colors.white : colors.ink}
                title={a.personName}
                subtitle={`${a.detail} · ${timeAgo(a.createdAt)}`}
                onPress={() => router.navigate('/family')}
              />
            ))}
            {!!pending.data?.length && (
              <ListRow
                icon="shield"
                iconBg={colors.highlighter}
                title={`${pending.data.length} ${pending.data.length === 1 ? 'report' : 'reports'} to review`}
                subtitle="Approve real scams so they warn people nearby"
                onPress={() => router.push('/admin')}
              />
            )}
          </ListGroup>
        </Section>
      )}

      <Section title="Recent" action={!!checks.data && checks.data.length > 3 && <TextLink label="See all" onPress={onSeeAll} />}>
        {checks.error ? (
          <ErrorState message={checks.error} onRetry={checks.reload} />
        ) : !recent ? (
          <Loading />
        ) : recent.length ? (
          <ListGroup>
            {recent.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ListGroup>
        ) : (
          <View style={styles.emptyRecent}>
            <Feather name="inbox" size={22} color={colors.inkSoft} />
            <T color={colors.inkSoft} style={{ flex: 1 }}>
              Nothing checked yet. When something feels off, check it here first.
            </T>
          </View>
        )}
      </Section>

      {!!explainers.data?.length && <TipOfTheDay guides={explainers.data} />}

      {(near || family.data) && (
        <Section title="Around you">
          <ListGroup>
            {near && (
              <ListRow
                icon="trending-up"
                title={`Going around: ${SCAM_LABELS[near.scamType]}`}
                subtitle={near.nearYou ? `${near.nearYou} reports near you this fortnight` : `${near.count} reports this fortnight`}
                onPress={() => (nearGuide ? router.navigate(`/learn/${nearGuide.slug}`) : router.navigate('/learn'))}
              />
            )}
            {family.data && <FamilyRow user={user} family={family.data} />}
          </ListGroup>
        </Section>
      )}
    </>
  );
}

/** One habit a day, taken from the Learn guides so admins edit it in one place. */
function TipOfTheDay({ guides }: { guides: Explainer[] }) {
  const [day] = useState(() => Math.floor(Date.now() / 86_400_000));
  const guide = guides[day % guides.length];
  const tip = guide.whatToDo[day % guide.whatToDo.length];
  return (
    <Section title="Tip for today">
      <Pressable
        onPress={() => router.navigate(`/learn/${guide.slug}`)}
        accessibilityRole="button"
        accessibilityLabel={`Tip for today: ${tip}. Read more about ${guide.title}`}
        style={({ pressed }) => [styles.tip, pressed && { transform: [{ scale: 0.98 }] }]}>
        <View style={styles.tipIcon}>
          <Feather name="sun" size={20} color={colors.ink} />
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <T v="label" style={{ fontSize: 18, lineHeight: 24 }}>
            {tip}
          </T>
          <T v="small" color={colors.inkSoft}>
            From the guide: {guide.title}
          </T>
        </View>
      </Pressable>
    </Section>
  );
}

/** Every check you've made, newest first, with how much you asked about each. */
function History({ checks }: { checks: ChecksLoad }) {
  if (checks.error) return <ErrorState message={checks.error} onRetry={checks.reload} />;
  if (!checks.data) return <Loading />;
  if (!checks.data.length) {
    return (
      <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
        <Feather name="search" size={36} color={colors.inkSoft} />
        <T v="heading">Nothing checked yet</T>
        <T color={colors.inkSoft} style={{ textAlign: 'center' }}>
          Every message, screenshot or call you check, and every question you ask about it, will be here.
        </T>
      </View>
    );
  }
  return (
    <ListGroup>
      {checks.data.map((c) => (
        <CheckRow key={c.id} check={c} />
      ))}
    </ListGroup>
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
  segments: { flexDirection: 'row', backgroundColor: colors.grey, borderRadius: radius.pill, padding: 4, marginBottom: -space.sm },
  segment: { flex: 1, minHeight: minTouch - 4, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  emptyRecent: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline },
  tip: { flexDirection: 'row', gap: space.md, padding: space.md + 2, borderRadius: radius.lg, backgroundColor: colors.waitTint },
  tipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.highlighter, alignItems: 'center', justifyContent: 'center' },
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
