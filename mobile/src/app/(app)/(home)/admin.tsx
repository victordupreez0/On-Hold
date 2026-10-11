import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api';
import { Button, Card, Chip, ErrorState, Feather, Header, Loading, Pill, Screen, T, timeAgo } from '@/components/ui';
import { CHANNEL_LABELS, SCAM_LABELS } from '@/fixtures';
import { colors, space } from '@/theme';
import { useToast } from '@/toast';
import type { Report } from '@/types';
import { useLoad } from '@/useLoad';

const REASONS = ['A personal dispute, not a scam', 'Contains personal information', 'Not enough detail', 'Already reported'];

/** Moderation queue: nothing reaches the map until a moderator approves it (pitch: innocent numbers aren't shamed). */
export default function Moderation() {
  const queue = useLoad(api.listPendingReports);

  return (
    <Screen>
      <Header title="Review reports" />
      <T color={colors.inkSoft}>Approve real scams so they warn people nearby. Reject anything personal, abusive or unclear.</T>
      {queue.error ? (
        <ErrorState message={queue.error} onRetry={queue.reload} />
      ) : !queue.data ? (
        <Loading />
      ) : !queue.data.length ? (
        <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
          <Feather name="check-circle" size={36} color={colors.safe} />
          <T v="heading">All caught up</T>
          <T color={colors.inkSoft}>No reports are waiting for review.</T>
        </View>
      ) : (
        queue.data.map((r) => <Item key={r.id} report={r} onDone={queue.reload} />)
      )}
    </Screen>
  );
}

function Item({ report: r, onDone }: { report: Report; onDone: () => void }) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const decide = async (decision: 'approved' | 'rejected', reason?: string) => {
    setBusy(true);
    try {
      await api.moderateReport(r.id, decision, reason);
      toast(decision === 'approved' ? `Approved. It now counts towards ${r.suburb} on the map.` : 'Rejected. The reporter will see why.');
      onDone();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pill label={SCAM_LABELS[r.scamType]} bg={colors.white} />
        <T v="small" color={colors.inkSoft}>
          {timeAgo(r.createdAt)}
        </T>
      </View>
      <T>{r.description}</T>
      <T v="small" color={colors.inkSoft}>
        {CHANNEL_LABELS[r.channel]} · {r.suburb}
        {r.sender ? ` · from ${r.sender}` : ''}
      </T>
      {rejecting ? (
        <View style={{ gap: space.sm }}>
          <T v="label">Why are you rejecting it?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {REASONS.map((reason) => (
              <Chip key={reason} label={reason} selected={false} onPress={() => decide('rejected', reason)} />
            ))}
          </View>
          <Button label="Cancel" variant="ghost" onPress={() => setRejecting(false)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button label="Approve" icon="check" variant="dark" loading={busy} onPress={() => decide('approved')} style={{ flex: 1 }} />
          <Button label="Reject" icon="x" variant="ghost" disabled={busy} onPress={() => setRejecting(true)} style={{ flex: 1 }} />
        </View>
      )}
    </Card>
  );
}
