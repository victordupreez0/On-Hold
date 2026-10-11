import { Stack } from 'expo-router';

import { colors } from '@/theme';

// Keeps the tab's root under any deep link, so back always has somewhere to go.
export const unstable_settings = { initialRouteName: 'index' };

export default function CheckStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }} />;
}
