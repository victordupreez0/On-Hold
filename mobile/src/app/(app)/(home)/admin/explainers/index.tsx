import { router } from 'expo-router';

import * as api from '@/api';
import { Button, Card, ErrorState, Header, Loading, Screen, T } from '@/components/ui';
import { SCAM_LABELS } from '@/fixtures';
import { colors } from '@/theme';
import { useLoad } from '@/useLoad';

export default function AdminExplainers() {
  const list = useLoad(api.listExplainers);

  return (
    <Screen wide footer={<Button label="Add a guide" icon="plus" onPress={() => router.push('/admin/explainers/new')} />}>
      <Header title="Learn guides" />
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : (
        list.data.map((e) => (
          <Card key={e.id} onPress={() => router.push(`/admin/explainers/${e.id}`)} accessibilityLabel={e.title}>
            <T v="label">{e.title}</T>
            <T v="small" color={colors.inkSoft}>
              {SCAM_LABELS[e.scamType]} · {e.slug}
            </T>
          </Card>
        ))
      )}
    </Screen>
  );
}
