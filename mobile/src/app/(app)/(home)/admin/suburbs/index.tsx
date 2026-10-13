import { router } from 'expo-router';

import * as api from '@/api';
import { Button, Card, ErrorState, Header, Loading, Screen, T } from '@/components/ui';
import { colors } from '@/theme';
import { useLoad } from '@/useLoad';

export default function AdminSuburbs() {
  const list = useLoad(api.listSuburbs);

  return (
    <Screen wide footer={<Button label="Add a suburb" icon="plus" onPress={() => router.push('/admin/suburbs/new')} />}>
      <Header title="Suburbs" />
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : (
        list.data.map((s) => (
          <Card key={s.name} onPress={() => router.push(`/admin/suburbs/${s.name}`)} accessibilityLabel={s.name}>
            <T v="label">{s.name}</T>
            <T v="small" color={colors.inkSoft}>
              {s.city} · {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
            </T>
          </Card>
        ))
      )}
    </Screen>
  );
}
