import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { ReportForm } from '@/components/ReportForm';
import { Button, ErrorState, Header, Loading, Screen } from '@/components/ui';
import { useToast } from '@/toast';
import type { ReportInput } from '@/types';
import { useLoad } from '@/useLoad';

/** Admin edit: unlike a reporter's own edit, this doesn't reset status to
 * pending -- the admin's save IS the review. Works on any report, any owner. */
export default function AdminEditReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const report = useLoad(() => api.getAdminReport(id), id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const save = async (input: ReportInput) => {
    setBusy(true);
    try {
      await api.adminUpdateReport(id, input);
      toast('Saved.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm('Delete this report?', 'This removes it everywhere, including the map if it was approved.', 'Delete', true);
    if (!ok) return;
    try {
      await api.adminDeleteReport(id);
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
