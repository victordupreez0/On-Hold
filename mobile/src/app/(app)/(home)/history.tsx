import { router } from 'expo-router';
import { View } from 'react-native';

import * as api from '@/api';
import { Card, ErrorState, Feather, Header, Loading, Screen, T, timeAgo } from '@/components/ui';
import { colors, space, verdictStyle } from '@/theme';
import { useLoad } from '@/useLoad';

export default function History() {
  const checks = useLoad(api.listMyChecks);

  return (
    <Screen>
      <Header title="History" />
      <T color={colors.inkSoft}>Every message, screenshot or call you’ve checked.</T>

      {checks.error ? (
        <ErrorState message={checks.error} onRetry={checks.reload} />
      ) : !checks.data ? (
        <Loading />
      ) : !checks.data.length ? (
        <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
          <Feather name="search" size={36} color={colors.inkSoft} />
          <T v="heading">Nothing checked yet</T>
          <T color={colors.inkSoft} style={{ textAlign: 'center' }}>
            Paste a message or describe a call from the Check tab to see it here.
          </T>
        </View>
      ) : (
        checks.data.map((c) => {
          const v = verdictStyle[c.verdict];
          return (
            <Card key={c.id} onPress={() => router.navigate(`/check/${c.id}`)} accessibilityLabel={`${c.headline}, ${v.word}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: v.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={v.icon} size={18} color={v.fg} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="label">{c.headline}</T>
                  <T v="small" color={colors.inkSoft}>
                    {v.word} · {c.kind === 'call' ? 'Call' : 'Message'} · {timeAgo(c.createdAt)}
                  </T>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
