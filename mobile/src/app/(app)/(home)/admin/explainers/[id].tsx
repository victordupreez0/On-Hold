import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { ExplainerForm, type ExplainerDraft } from '@/components/ExplainerForm';
import { Button, ErrorState, Header, Loading, Screen } from '@/components/ui';
import { useToast } from '@/toast';
import { useLoad } from '@/useLoad';

export default function EditExplainer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // No single-guide-by-id GET -- the list is small, and every screen that
  // links here already has it loaded. Finding by id client-side avoids a
  // redundant route for 20-ish rows.
  const list = useLoad(api.listExplainers);
  const explainer = list.data?.find((e) => e.id === id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const save = async (d: ExplainerDraft) => {
    setBusy(true);
    try {
      await api.updateExplainer(id, d);
      toast('Saved.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm('Delete this guide?', 'It will no longer show in Learn.', 'Delete', true);
    if (!ok) return;
    try {
      await api.deleteExplainer(id);
      toast('Guide deleted.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <Screen>
      <Header title="Edit guide" />
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : !explainer ? (
        <ErrorState message="We couldn’t find that guide." onRetry={list.reload} />
      ) : (
        <>
          <ExplainerForm key={explainer.id} initial={explainer} submitLabel="Save changes" busy={busy} onSubmit={save} />
          <Button label="Delete guide" variant="ghost" icon="trash-2" onPress={remove} />
        </>
      )}
    </Screen>
  );
}
