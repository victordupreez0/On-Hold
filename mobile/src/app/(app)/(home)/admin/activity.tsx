import { useState } from 'react';
import { ScrollView } from 'react-native';

import * as api from '@/api';
import type { ActivityType } from '@/api';
import { ACTIVITY, ActivityList } from '@/components/ActivityList';
import { Button, Chip, EmptyState, ErrorState, Header, Loading, Screen } from '@/components/ui';
import { space } from '@/theme';
import { useLoad } from '@/useLoad';

const PAGE = 50;

/** Everything people do in the app, newest first, filterable by kind. */
export default function AdminActivity() {
  const [type, setType] = useState<ActivityType | undefined>();
  const [limit, setLimit] = useState(PAGE);
  const feed = useLoad(() => api.listActivity({ type, limit }), `${type ?? 'all'}-${limit}`);

  const pick = (t?: ActivityType) => {
    setType(t);
    setLimit(PAGE);
  };

  return (
    <Screen wide>
      <Header title="Activity" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.md }}>
        <Chip label="Everything" selected={!type} onPress={() => pick()} />
        {(Object.keys(ACTIVITY) as ActivityType[]).map((t) => (
          <Chip key={t} label={ACTIVITY[t].label} icon={ACTIVITY[t].icon} selected={type === t} onPress={() => pick(t)} />
        ))}
      </ScrollView>

      {feed.error ? (
        <ErrorState message={feed.error} onRetry={feed.reload} />
      ) : !feed.data ? (
        <Loading />
      ) : !feed.data.length ? (
        <EmptyState icon="inbox" title="Nothing yet" body="No activity of this kind so far." />
      ) : (
        <>
          <ActivityList items={feed.data} />
          {feed.data.length === limit && limit < 200 && <Button label="Show more" variant="secondary" icon="chevron-down" onPress={() => setLimit(limit + PAGE)} />}
        </>
      )}
    </Screen>
  );
}
