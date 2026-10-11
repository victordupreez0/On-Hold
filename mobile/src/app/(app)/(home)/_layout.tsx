import { Stack } from 'expo-router';

import { useSession } from '@/session';
import { colors } from '@/theme';

// Keeps Home under any deep link, so back always has somewhere to go.
export const unstable_settings = { initialRouteName: 'index' };

export default function HomeStack() {
  // useSession, not useUser: this layout can render once more while signing out.
  const { user } = useSession();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
      <Stack.Screen name="index" />
      {/* Client-side guard for navigation only; Phase 2's API enforces the admin role server-side. */}
      <Stack.Protected guard={user?.role === 'admin'}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}
