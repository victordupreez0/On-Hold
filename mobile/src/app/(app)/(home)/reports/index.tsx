import { router } from 'expo-router';
import { View } from 'react-native';

import * as api from '@/api';
import { Button, Card, ErrorState, Feather, Header, Loading, Pill, Screen, T, timeAgo } from '@/components/ui';
import { CHANNEL_LABELS, SCAM_LABELS } from '@/fixtures';
import { colors, space } from '@/theme';
import type { Report } from '@/types';
import { useLoad } from '@/useLoad';

const STATUS: Record<Report['status'], { label: string; bg: string; fg: string; icon: 'clock' | 'map-pin' | 'x-circle' }> = {
  pending: { label: 'Waiting for review', bg: colors.waitTint, fg: colors.ink, icon: 'clock' },
  approved: { label: 'Live on the map', bg: colors.safeTint, fg: colors.ink, icon: 'map-pin' },
  rejected: { label: 'Not published', bg: colors.stopTint, fg: colors.ink, icon: 'x-circle' },
};

export default function MyReports() {
  const reports = useLoad(api.listMyReports);

  return (
    <Screen footer={<Button label="Report a scam" icon="flag" onPress={() => router.push('/reports/new')} />}>
      <Header title="My reports" />
      <T color={colors.inkSoft}>Every report warns people near you. You can edit or delete yours at any time.</T>

      {reports.error ? (
        <ErrorState message={reports.error} onRetry={reports.reload} />
      ) : !reports.data ? (
        <Loading />
      ) : !reports.data.length ? (
        <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
          <Feather name="flag" size={36} color={colors.inkSoft} />
          <T v="heading">No reports yet</T>
          <T color={colors.inkSoft} style={{ textAlign: 'center' }}>
            When you spot a scam, report it here or from a verdict.
          </T>
        </View>
      ) : (
        reports.data.map((r) => {
          const s = STATUS[r.status];
          return (
            <Card key={r.id} onPress={() => router.push(`/reports/${r.id}`)} accessibilityLabel={`${SCAM_LABELS[r.scamType]}, ${s.label}. Edit`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pill label={s.label} bg={s.bg} fg={s.fg} icon={s.icon} />
                <T v="small" color={colors.inkSoft}>
                  {timeAgo(r.createdAt)}
                </T>
              </View>
              <T v="label">{SCAM_LABELS[r.scamType]}</T>
              <T v="small" numberOfLines={2}>
                {r.description}
              </T>
              <T v="small" color={colors.inkSoft}>
                {CHANNEL_LABELS[r.channel]} · {r.suburb}
              </T>
              {r.status === 'rejected' && r.rejectReason && (
                <T v="small" color={colors.stop}>
                  Moderator: {r.rejectReason}
                </T>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
