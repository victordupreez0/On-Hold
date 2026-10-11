import { StyleSheet, Text, View } from 'react-native';

import { BreathingRing } from '@/components/BreathingRing';
import { Logo } from '@/components/Logo';
import { colors, type } from '@/theme';

export default function Index() {
  return (
    <View style={styles.wrap}>
      <Logo size={56} wordmark />
      <BreathingRing />
      <Text style={type.title}>Pause before you pay.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.white },
});
