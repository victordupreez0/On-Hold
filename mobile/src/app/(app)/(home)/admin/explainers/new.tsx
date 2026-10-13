import { router } from 'expo-router';
import { useState } from 'react';

import * as api from '@/api';
import { ExplainerForm, type ExplainerDraft } from '@/components/ExplainerForm';
import { Header, Screen } from '@/components/ui';
import { useToast } from '@/toast';

const BLANK: ExplainerDraft = {
  slug: '',
  scamType: 'other',
  title: '',
  summary: '',
  example: { channel: 'sms', text: '' },
  signs: [],
  whatToDo: [],
  source: { name: '', url: '' },
};

export default function NewExplainer() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const save = async (d: ExplainerDraft) => {
    setBusy(true);
    try {
      await api.createExplainer(d);
      toast('Guide added.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Add a guide" />
      <ExplainerForm initial={BLANK} submitLabel="Add guide" busy={busy} onSubmit={save} />
    </Screen>
  );
}
