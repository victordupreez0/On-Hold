import { useLocalSearchParams } from 'expo-router';

import { Header, Screen, T } from '@/components/ui';

export default function VerdictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <Header />
      <T v="title">Check {id}</T>
    </Screen>
  );
}
