import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import * as api from '@/api';
import { confirm } from '@/confirm';
import { Button, ErrorState, Header, Loading, Screen } from '@/components/ui';
import { SuburbForm } from '@/components/SuburbForm';
import { useToast } from '@/toast';
import type { Suburb } from '@/types';
import { useLoad } from '@/useLoad';

export default function EditSuburb() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const list = useLoad(api.listSuburbs);
  const suburb = list.data?.find((s) => s.name === name);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const save = async (s: Suburb) => {
    setBusy(true);
    try {
      await api.updateSuburb(name, { city: s.city, lat: s.lat, lng: s.lng });
      toast('Saved.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm(`Delete ${name}?`, 'This fails safely if anyone’s profile or a report still uses it.', 'Delete', true);
    if (!ok) return;
    try {
      await api.deleteSuburb(name);
      toast('Suburb deleted.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <Screen>
      <Header title={name} />
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : !suburb ? (
        <ErrorState message="We couldn’t find that suburb." onRetry={list.reload} />
      ) : (
        <>
          <SuburbForm key={suburb.name} initial={suburb} editingName submitLabel="Save changes" busy={busy} onSubmit={save} />
          <Button label="Delete suburb" variant="ghost" icon="trash-2" onPress={remove} />
        </>
      )}
    </Screen>
  );
}
