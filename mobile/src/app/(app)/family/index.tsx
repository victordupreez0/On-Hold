import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { confirm } from '@/confirm';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Feather,
  ListGroup,
  ListRow,
  Loading,
  PageTitle,
  Pill,
  Screen,
  Section,
  T,
  Toggle,
  hoursSince,
  timeAgo,
  type IconName,
} from '@/components/ui';
import { useUser } from '@/session';
import { colors, minTouch, space } from '@/theme';
import { useToast } from '@/toast';
import type { AlertItem, GuardianLink } from '@/types';
import { useLoad } from '@/useLoad';

export default function Family() {
  const user = useUser();
  return user.role === 'guardian' ? <GuardianView /> : <ProtectedView />;
}

// ---------- Guardian: "people I look out for" (Life360-style status + alert timeline) ----------

const ALERT_ICON: Record<AlertItem['type'], IconName> = {
  stop_verdict: 'octagon',
  wait_verdict: 'alert-triangle',
  asked_for_help: 'message-circle',
  invite_accepted: 'user-check',
};

function GuardianView() {
  const family = useLoad(api.getFamily);
  const alerts = useLoad(api.listAlerts);

  // Opening the timeline counts as seeing it; unread styling still shows on this visit.
  useEffect(() => {
    if (alerts.data) api.markAlertsSeen().catch(() => {});
  }, [alerts.data]);

  const invite = <Button label="Invite someone" icon="user-plus" onPress={() => router.push('/family/invite')} />;

  return (
    <Screen>
      <PageTitle title="Family" subtitle="Get a heads-up when someone you look out for might be getting scammed." />

      {family.error ? (
        <ErrorState message={family.error} onRetry={family.reload} />
      ) : !family.data ? (
        <Loading />
      ) : !family.data.lookingAfter.length ? (
        <EmptyState icon="users" title="No one yet" body="Invite a parent or relative. They choose exactly what you can see." action={invite} />
      ) : (
        <>
          <Section title="People you look out for">
            <ListGroup>
              {family.data.lookingAfter.map((l) => (
                <Person key={l.id} link={l} latest={alerts.data?.find((a) => a.linkId === l.id && a.type !== 'invite_accepted')} />
              ))}
            </ListGroup>
          </Section>
          {invite}
        </>
      )}

      {!!alerts.data?.length && (
        <Section title="Recent alerts">
          <ListGroup>
            {alerts.data.slice(0, 6).map((a) => (
              <ListRow
                key={a.id}
                icon={ALERT_ICON[a.type]}
                iconBg={a.type === 'stop_verdict' ? colors.stop : a.seen ? colors.grey : colors.highlighter}
                iconColor={a.type === 'stop_verdict' ? colors.white : colors.ink}
                title={`${a.personName}${a.seen ? '' : ' · new'}`}
                subtitle={`${a.detail} · ${timeAgo(a.createdAt)}`}
              />
            ))}
          </ListGroup>
        </Section>
      )}
    </Screen>
  );
}

function Person({ link, latest }: { link: GuardianLink; latest?: AlertItem }) {
  const pending = link.status === 'pending';
  const atRisk = latest?.type === 'stop_verdict' && hoursSince(latest.createdAt) < 24;
  const status = pending ? (
    <Pill label="Invite sent" icon="clock" bg={colors.waitTint} />
  ) : atRisk ? (
    <Pill label={`Stop ${timeAgo(latest!.createdAt)}`} icon="octagon" bg={colors.stop} fg={colors.white} />
  ) : (
    <Pill label="All calm" icon="check" bg={colors.safeTint} />
  );
  return (
    <View style={styles.person}>
      <View style={[styles.avatar, atRisk && { backgroundColor: colors.stop }]}>
        <T v="label" color={atRisk ? colors.white : colors.ink}>
          {link.protectedName.slice(0, 1)}
        </T>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <T v="label">{link.protectedName}</T>
        {status}
      </View>
      {link.invitedPhone && !pending && (
        <Pressable
          onPress={() => Linking.openURL(`tel:${link.invitedPhone}`)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${link.protectedName}`}
          style={({ pressed }) => [styles.callButton, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Feather name="phone" size={22} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

// ---------- Protected: who looks out for me, and what they can see ----------

function ProtectedView() {
  const family = useLoad(api.getFamily);
  const toast = useToast();

  const share = async (link: GuardianLink, patch: Partial<Pick<GuardianLink, 'shareCalls' | 'shareVerdicts'>>) => {
    try {
      await api.updateSharing(link.id, { shareCalls: link.shareCalls, shareVerdicts: link.shareVerdicts, ...patch });
      toast('Saved. You can change this any time.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      // Either way, reload from the server rather than trust the toggle's own optimistic
      // state -- a consent control should always reflect what's actually saved.
      family.reload();
    }
  };

  const stop = async (link: GuardianLink) => {
    const ok = await confirm(`Stop sharing with ${link.guardianName}?`, `${link.guardianName} won’t get any more alerts from you.`, 'Stop sharing', true);
    if (!ok) return;
    try {
      await api.removeLink(link.id);
      toast(`${link.guardianName} won’t get alerts any more.`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      family.reload();
    }
  };

  const codeButton = <Button label="I have an invite code" variant="ghost" icon="key" onPress={() => router.push('/family/accept')} />;

  return (
    <Screen>
      <PageTitle title="Family" subtitle="Someone you trust can get a heads-up if something looks like a scam." />

      {family.error ? (
        <ErrorState message={family.error} onRetry={family.reload} />
      ) : !family.data ? (
        <Loading />
      ) : !family.data.lookedAfterBy.length ? (
        <EmptyState
          icon="heart"
          title="No one linked yet"
          body="Ask a son, daughter or friend to install On Hold and invite you, then enter their code."
          action={codeButton}
        />
      ) : (
        <>
          {family.data.lookedAfterBy.map((l) => (
            <Section key={l.id} title={`${l.guardianName} can see`}>
              <Card>
                <Toggle label="When I get a Stop" detail="The warning only, never your messages." value={l.shareVerdicts} onChange={(shareVerdicts) => share(l, { shareVerdicts })} />
                <View style={styles.divider} />
                <Toggle label="When I check a call" detail="Only if that call turns out to be a Stop." value={l.shareCalls} onChange={(shareCalls) => share(l, { shareCalls })} />
                <View style={styles.divider} />
                <Pressable onPress={() => stop(l)} accessibilityRole="button" style={styles.stopRow}>
                  <T v="label" color={colors.stop}>
                    Stop sharing with {l.guardianName}
                  </T>
                </Pressable>
              </Card>
            </Section>
          ))}
          {codeButton}
        </>
      )}

      <View style={styles.privacy}>
        <Feather name="lock" size={18} color={colors.inkSoft} />
        <T v="small" color={colors.inkSoft} style={{ flex: 1 }}>
          Family never sees your messages, contacts or banking. Only the alerts you allow.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 76 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  stopRow: { minHeight: minTouch, justifyContent: 'center' },
  privacy: { flexDirection: 'row', gap: space.sm, alignItems: 'center', paddingHorizontal: space.xs },
});
