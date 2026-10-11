import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Button, T } from '@/components/ui';
import { colors, space } from '@/theme';

export default function Welcome() {
  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.hero}>
          <Logo size={168} onYellow />
        </View>
        <View style={styles.body}>
          <Logo size={36} wordmark />
          <T v="hero" role="heading">
            Pause before you pay.
          </T>
          <T color={colors.inkSoft}>
            Check any message or call that feels off. We’ll tell you plainly if it looks like a scam, and let your family
            know if you want us to.
          </T>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Button label="Get started" variant="dark" onPress={() => router.push('/sign-up')} />
            <Button label="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: {
    flex: 1,
    minHeight: 240,
    margin: space.md,
    borderRadius: 32,
    backgroundColor: colors.highlighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: space.lg - 4, paddingTop: space.sm, gap: space.md },
});
