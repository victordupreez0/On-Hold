import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import * as api from '@/api';
import { Button, ErrorState, Feather, Header, Loading, Pill, Screen, T } from '@/components/ui';
import { CHANNEL_ICONS, CHANNEL_LABELS } from '@/fixtures';
import { colors, minTouch, radius, space } from '@/theme';
import type { Explainer } from '@/types';
import { useLoad } from '@/useLoad';

export default function ExplainerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const guide = useLoad(() => api.getExplainer(slug), slug);

  return (
    <Screen>
      <Header />
      {guide.data ? <Guide e={guide.data} /> : guide.error ? <ErrorState message={guide.error} onRetry={guide.reload} /> : <Loading />}
    </Screen>
  );
}

function Guide({ e }: { e: Explainer }) {
  const isCall = e.example.channel === 'call';
  return (
    <>
      <View style={{ gap: space.sm }}>
        <T v="title" role="heading">
          {e.title}
        </T>
        <T color={colors.inkSoft}>{e.summary}</T>
      </View>

      <View style={{ gap: space.sm }}>
        <T v="heading" role="heading">
          What it looks like
        </T>
        <View style={[styles.example, isCall && styles.exampleCall]} accessibilityLabel={`Example ${CHANNEL_LABELS[e.example.channel]}: ${e.example.text}`}>
          <Pill label={`Example ${CHANNEL_LABELS[e.example.channel]}`} icon={CHANNEL_ICONS[e.example.channel]} bg={isCall ? colors.highlighter : colors.white} />
          <T color={isCall ? colors.white : colors.ink} style={isCall ? { fontStyle: 'italic' } : undefined}>
            {e.example.text}
          </T>
        </View>
      </View>

      {e.playbook.length > 0 && (
        <View style={{ gap: space.sm }}>
          <T v="heading" role="heading">
            How they take your money
          </T>
          <View style={styles.plan}>
            {!!e.countingOn && (
              <View style={{ gap: space.xs }}>
                <T v="overline" color={colors.highlighter}>
                  What they’re counting on
                </T>
                <T v="heading" color={colors.white}>
                  {e.countingOn}
                </T>
              </View>
            )}
            {e.playbook.map((s, i) => (
              <View key={s} style={styles.line}>
                <View style={styles.num}>
                  <T v="label">{i + 1}</T>
                </View>
                <T color={colors.white} style={{ flex: 1 }}>
                  {s}
                </T>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ gap: space.sm + 2 }}>
        <T v="heading" role="heading">
          How to spot it
        </T>
        {e.signs.map((s) => (
          <View key={s} style={styles.line}>
            <Feather name="alert-triangle" size={20} color={colors.ink} style={{ marginTop: 3 }} />
            <T style={{ flex: 1 }}>{s}</T>
          </View>
        ))}
      </View>

      <View style={{ gap: space.sm + 2 }}>
        <T v="heading" role="heading">
          What to do
        </T>
        {e.whatToDo.map((s, i) => (
          <View key={s} style={styles.line}>
            <View style={styles.num}>
              <T v="label">{i + 1}</T>
            </View>
            <T style={{ flex: 1 }}>{s}</T>
          </View>
        ))}
      </View>

      <Button
        label={isCall ? 'Someone is on the phone now' : 'Got one like this? Check it'}
        icon={isCall ? 'phone-call' : 'search'}
        onPress={() => router.navigate(isCall ? { pathname: '/check', params: { mode: 'call' } } : '/check')}
      />

      <Pressable onPress={() => Linking.openURL(e.source.url)} accessibilityRole="link" accessibilityLabel={`Source: ${e.source.name}`} style={styles.source}>
        <Feather name="external-link" size={16} color={colors.inkSoft} />
        <T v="small" color={colors.inkSoft} style={{ textDecorationLine: 'underline' }}>
          Source: {e.source.name}
        </T>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  example: { backgroundColor: colors.grey, borderRadius: radius.lg, borderTopLeftRadius: 4, padding: space.md, gap: space.sm },
  exampleCall: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg },
  plan: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.md + 4, gap: space.md + 2 },
  line: { flexDirection: 'row', gap: space.sm + 4, alignItems: 'flex-start' },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.highlighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: minTouch },
});
