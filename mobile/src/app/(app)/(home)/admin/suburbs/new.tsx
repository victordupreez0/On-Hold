import { router } from 'expo-router';
import { useState } from 'react';

import * as api from '@/api';
import { Header, Screen } from '@/components/ui';
import { SuburbForm } from '@/components/SuburbForm';
import { useToast } from '@/toast';
import type { Suburb } from '@/types';

export default function NewSuburb() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const save = async (s: Suburb) => {
    setBusy(true);
    try {
      await api.createSuburb(s);
      toast('Suburb added.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Add a suburb" />
      <SuburbForm initial={{ name: '', city: '', lat: 0, lng: 0 }} editingName={false} submitLabel="Add suburb" busy={busy} onSubmit={save} />
    </Screen>
  );
}
