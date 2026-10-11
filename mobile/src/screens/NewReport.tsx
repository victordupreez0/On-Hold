import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import * as api from '@/api';
import { ReportForm } from '@/components/ReportForm';
import { Header, Screen, T } from '@/components/ui';
import { useUser } from '@/session';
import { colors } from '@/theme';
import { useToast } from '@/toast';
import type { Channel, ReportInput, ScamType } from '@/types';

export default function NewReport() {
  const user = useUser();
  const toast = useToast();
  const params = useLocalSearchParams<{ checkId?: string; scamType?: ScamType; channel?: Channel }>();
  const [busy, setBusy] = useState(false);

  const submit = async (input: ReportInput) => {
    setBusy(true);
    try {
      await api.createReport({ ...input, checkId: params.checkId ?? null });
      toast('Thank you. We’ll check it, then it goes on the map.');
      router.back();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title="Report a scam" />
      <T color={colors.inkSoft}>Your report warns people in your area about what’s going around.</T>
      <ReportForm
        submitLabel="Send report"
        busy={busy}
        onSubmit={submit}
        initial={{
          channel: params.channel ?? null,
          scamType: params.scamType ?? null,
          description: '',
          sender: '',
          suburb: user.suburb,
        }}
      />
    </Screen>
  );
}
