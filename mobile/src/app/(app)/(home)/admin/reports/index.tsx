import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import * as api from '@/api';
import type { AdminReport } from '@/api';
import { confirm } from '@/confirm';
import { Button, Card, Chip, ErrorState, Feather, Header, Loading, Pill, Screen, T, timeAgo } from '@/components/ui';
import { CHANNEL_LABELS, SCAM_LABELS } from '@/fixtures';
import { colors, space } from '@/theme';
import { useToast } from '@/toast';
import type { ReportStatus } from '@/types';
import { useLoad } from '@/useLoad';

const REASONS = ['A personal dispute, not a scam', 'Contains personal information', 'Not enough detail', 'Already reported'];
const FILTERS: { label: string; status?: ReportStatus }[] = [
  { label: 'Pending', status: 'pending' },
  { label: 'Approved', status: 'approved' },
  { label: 'Rejected', status: 'rejected' },
  { label: 'All' },
];

/** Full report admin: moderate pending ones, edit or remove any report regardless of status. */
export default function AdminReports() {
  const [status, setStatus] = useState<ReportStatus | undefined>('pending');
  const list = useLoad(() => api.listAllReports({ status, limit: 100 }), status ?? 'all');

  return (
    <Screen wide>
      <Header title="Reports" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.label} label={f.label} selected={status === f.status} onPress={() => setStatus(f.status)} />
        ))}
      </ScrollView>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : !list.data.length ? (
        <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
          <Feather name="check-circle" size={36} color={colors.safe} />
          <T v="heading">Nothing here</T>
          <T color={colors.inkSoft}>No reports match this filter.</T>
        </View>
      ) : (
        list.data.map((r) => <ReportCard key={r.id} report={r} onDone={list.reload} />)
      )}
    </Screen>
  );
}

const STATUS_PILL: Record<ReportStatus, { label: string; bg: string }> = {
  pending: { label: 'Pending', bg: colors.waitTint },
  approved: { label: 'Approved', bg: colors.safeTint },
  rejected: { label: 'Rejected', bg: colors.stopTint },
};

function ReportCard({ report: r, onDone }: { report: AdminReport; onDone: () => void }) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const moderate = async (decision: 'approved' | 'rejected', reason?: string) => {
    setBusy(true);
    try {
      await api.moderateReport(r.id, decision, reason);
      toast(decision === 'approved' ? `Approved. It now counts towards ${r.suburb} on the map.` : 'Rejected. The reporter will see why.');
      onDone();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm('Delete this report?', 'This removes it everywhere, including the map if it was approved.', 'Delete', true);
    if (!ok) return;
    setBusy(true);
    try {
      await api.adminDeleteReport(r.id);
      toast('Report deleted.');
      onDone();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Pill label={SCAM_LABELS[r.scamType]} bg={colors.white} />
          <Pill label={STATUS_PILL[r.status].label} bg={STATUS_PILL[r.status].bg} />
        </View>
        <T v="small" color={colors.inkSoft}>
          {timeAgo(r.createdAt)}
        </T>
      </View>
      <T>{r.description}</T>
      <T v="small" color={colors.inkSoft}>
        {CHANNEL_LABELS[r.channel]} · {r.suburb}
        {r.sender ? ` · from ${r.sender}` : ''}
      </T>
      {r.status === 'rejected' && r.rejectReason && (
        <T v="small" color={colors.stop}>
          Reason: {r.rejectReason}
        </T>
      )}

      {rejecting ? (
        <View style={{ gap: space.sm }}>
          <T v="label">Why are you rejecting it?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {REASONS.map((reason) => (
              <Chip key={reason} label={reason} selected={false} onPress={() => moderate('rejected', reason)} />
            ))}
          </View>
          <Button label="Cancel" variant="ghost" onPress={() => setRejecting(false)} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {r.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="Approve" icon="check" variant="dark" loading={busy} onPress={() => moderate('approved')} style={{ flex: 1 }} />
              <Button label="Reject" icon="x" variant="ghost" disabled={busy} onPress={() => setRejecting(true)} style={{ flex: 1 }} />
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Edit" icon="edit-2" variant="secondary" disabled={busy} onPress={() => router.push(`/admin/reports/${r.id}`)} style={{ flex: 1 }} />
            <Button label="Delete" icon="trash-2" variant="danger" loading={busy} onPress={remove} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </Card>
  );
}
