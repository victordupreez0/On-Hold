import { Stack } from 'expo-router';

import { useSession } from '@/session';
import { colors } from '@/theme';

export default function AppLayout() {
  // useSession, not useUser: this layout can render once more while signing out.
  const { user } = useSession();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
      {/* Declared first so Home stays the initial route for every role. */}
      <Stack.Screen name="(tabs)" />
      {/* Client-side guard for navigation only; Phase 2's API enforces the admin role server-side. */}
      <Stack.Protected guard={user?.role === 'admin'}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}
