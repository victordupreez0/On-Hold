import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { ReportForm } from '@/components/ReportForm';
import { Button, ErrorState, Feather, Header, Loading, Screen, T } from '@/components/ui';
import { colors, space } from '@/theme';
import { useToast } from '@/toast';
import type { ReportInput } from '@/types';
import { useLoad } from '@/useLoad';

export default function EditReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const report = useLoad(() => api.getReport(id), id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const save = async (input: ReportInput) => {
    setBusy(true);
    try {
      await api.updateReport(id, input);
      toast('Saved. A moderator will check it again.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm('Delete this report?', 'It will be removed from the map. This can’t be undone.', 'Delete', true);
    if (!ok) return;
    try {
      await api.deleteReport(id);
      toast('Report deleted.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const r = report.data;
  return (
    <Screen>
      <Header title="Edit report" />
      {report.error ? (
        <ErrorState message={report.error} onRetry={report.reload} />
      ) : !r ? (
        <Loading />
      ) : (
        <>
          {r.status === 'approved' && (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <Feather name="info" size={18} color={colors.ink} />
              <T v="small" style={{ flex: 1 }}>
                This report is live. Changes go back to a moderator before they show.
              </T>
            </View>
          )}
          <ReportForm
            key={r.id}
            submitLabel="Save changes"
            busy={busy}
            onSubmit={save}
            initial={{ channel: r.channel, scamType: r.scamType, description: r.description, sender: r.sender ?? '', suburb: r.suburb }}
          />
          <Button label="Delete report" variant="ghost" icon="trash-2" onPress={remove} />
        </>
      )}
    </Screen>
  );
}
