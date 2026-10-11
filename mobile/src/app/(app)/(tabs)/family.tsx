import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { Button, Card, ErrorState, Feather, Loading, Pill, Screen, Section, T, Toggle, hoursSince, timeAgo, type IconName } from '@/components/ui';
import { useUser } from '@/session';
import { colors, minTouch, radius, space } from '@/theme';
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
    if (alerts.data) api.markAlertsSeen();
  }, [alerts.data]);

  return (
    <Screen edges={['top']} footer={<Button label="Invite someone" icon="user-plus" onPress={() => router.push('/family/invite')} />}>
      <View style={{ gap: space.xs }}>
        <T v="title" role="heading">
          Family
        </T>
        <T color={colors.inkSoft}>You’ll get a heads-up when someone you look out for gets a Stop, so you can call before they pay.</T>
      </View>

      {family.error ? (
        <ErrorState message={family.error} onRetry={family.reload} />
      ) : !family.data ? (
        <Loading />
      ) : !family.data.lookingAfter.length ? (
        <Empty icon="users" title="No one yet" body="Invite a parent or relative. They choose exactly what you can see." />
      ) : (
        <Section title="People you look out for">
          {family.data.lookingAfter.map((l) => (
            <Person key={l.id} link={l} latest={alerts.data?.find((a) => a.linkId === l.id && a.type !== 'invite_accepted')} />
          ))}
        </Section>
      )}

      {!!alerts.data?.length && (
        <Section title="Alerts">
          {alerts.data.map((a) => (
            <View key={a.id} style={[styles.alert, !a.seen && styles.alertNew]} accessibilityLabel={`${a.personName}: ${a.detail}, ${timeAgo(a.createdAt)}${a.seen ? '' : ', new'}`}>
              <View style={[styles.alertIcon, a.type === 'stop_verdict' && { backgroundColor: colors.stop }]}>
                <Feather name={ALERT_ICON[a.type]} size={18} color={a.type === 'stop_verdict' ? colors.white : colors.ink} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="label">{a.personName}</T>
                <T v="small">{a.detail}</T>
                <T v="small" color={colors.inkSoft}>
                  {timeAgo(a.createdAt)}
                </T>
              </View>
            </View>
          ))}
        </Section>
      )}
    </Screen>
  );
}

function Person({ link, latest }: { link: GuardianLink; latest?: AlertItem }) {
  const pending = link.status === 'pending';
  const atRisk = latest?.type === 'stop_verdict' && hoursSince(latest.createdAt) < 24;
  return (
    <Card>
      <View style={styles.personRow}>
        <View style={[styles.avatar, atRisk && { backgroundColor: colors.stop }]}>
          <T v="label" color={atRisk ? colors.white : colors.ink}>
            {link.protectedName.slice(0, 1)}
          </T>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="label">{link.protectedName}</T>
          {pending ? (
            <Pill label="Invite sent" icon="clock" bg={colors.waitTint} />
          ) : atRisk ? (
            <Pill label={`Stop ${timeAgo(latest!.createdAt)}`} icon="octagon" bg={colors.stop} fg={colors.white} />
          ) : (
            <Pill label="All calm" icon="check" bg={colors.safeTint} />
          )}
        </View>
        {link.invitedPhone && !pending && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${link.invitedPhone}`)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${link.protectedName}`}
            style={styles.callButton}>
            <Feather name="phone" size={22} color={colors.white} />
          </Pressable>
        )}
      </View>
      {!pending && (
        <T v="small" color={colors.inkSoft}>
          Sharing {[link.shareVerdicts && 'Stop verdicts', link.shareCalls && 'calls'].filter(Boolean).join(' and ') || 'nothing right now'}.
        </T>
      )}
    </Card>
  );
}

// ---------- Protected: who looks out for me, and what they can see ----------

function ProtectedView() {
  const family = useLoad(api.getFamily);
  const toast = useToast();

  const share = async (link: GuardianLink, patch: Partial<Pick<GuardianLink, 'shareCalls' | 'shareVerdicts'>>) => {
    await api.updateSharing(link.id, { shareCalls: link.shareCalls, shareVerdicts: link.shareVerdicts, ...patch });
    family.reload();
    toast('Saved. You can change this any time.');
  };

  const stop = async (link: GuardianLink) => {
    const ok = await confirm(`Stop sharing with ${link.guardianName}?`, `${link.guardianName} won’t get any more alerts from you.`, 'Stop sharing', true);
    if (!ok) return;
    await api.removeLink(link.id);
    family.reload();
    toast(`${link.guardianName} won’t get alerts any more.`);
  };

  return (
    <Screen edges={['top']} footer={<Button label="I have an invite code" variant="secondary" icon="key" onPress={() => router.push('/family/accept')} />}>
      <View style={{ gap: space.xs }}>
        <T v="title" role="heading">
          Family
        </T>
        <T color={colors.inkSoft}>Someone you trust can get a heads-up when something looks like a scam. You choose what they see.</T>
      </View>

      {family.error ? (
        <ErrorState message={family.error} onRetry={family.reload} />
      ) : !family.data ? (
        <Loading />
      ) : !family.data.lookedAfterBy.length ? (
        <Empty
          icon="heart"
          title="No one linked yet"
          body="Ask a son, daughter or friend to install On Hold and invite you. Then enter their code here."
        />
      ) : (
        <Section title="Looking out for you">
          {family.data.lookedAfterBy.map((l) => (
            <Card key={l.id}>
              <View style={styles.personRow}>
                <View style={styles.avatar}>
                  <T v="label">{l.guardianName.slice(0, 1)}</T>
                </View>
                <T v="label" style={{ flex: 1 }}>
                  {l.guardianName}
                </T>
              </View>
              <Toggle
                label="Tell them when I get a Stop"
                detail="They see the warning, never your messages."
                value={l.shareVerdicts}
                onChange={(shareVerdicts) => share(l, { shareVerdicts })}
              />
              <Toggle
                label="Tell them when I check a call"
                detail="So they can phone you while it’s happening."
                value={l.shareCalls}
                onChange={(shareCalls) => share(l, { shareCalls })}
              />
              <Pressable onPress={() => stop(l)} accessibilityRole="button" style={{ minHeight: minTouch, justifyContent: 'center' }}>
                <T v="label" color={colors.stop} style={{ textDecorationLine: 'underline' }}>
                  Stop sharing with {l.guardianName}
                </T>
              </Pressable>
            </Card>
          ))}
        </Section>
      )}

      <View style={styles.privacy}>
        <Feather name="lock" size={20} color={colors.ink} />
        <T v="small" style={{ flex: 1 }}>
          Family never sees your messages, contacts or banking. Only the alerts you allow above.
        </T>
      </View>
    </Screen>
  );
}

function Empty({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
      <Feather name={icon} size={36} color={colors.inkSoft} />
      <T v="heading">{title}</T>
      <T color={colors.inkSoft} style={{ textAlign: 'center' }}>
        {body}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  personRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
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
  alert: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', padding: space.md - 4, borderRadius: radius.md },
  alertNew: { backgroundColor: colors.waitTint },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacy: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start', backgroundColor: colors.grey, borderRadius: radius.md, padding: space.md },
});
