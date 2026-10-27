import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/session';
import { colors } from '@/theme';
import { ToastProvider } from '@/toast';

SplashScreen.preventAutoHideAsync();

// In the website's phone frame (an iframe), the frame draws its status bar and home bar
// over the app like a real iPhone. These insets keep content clear of them while each
// screen's own colour runs underneath. Must match .status and .home-bar in website/styles.css.
const FRAME_INSETS = Platform.OS === 'web' && window.self !== window.top ? { top: 46, bottom: 26, left: 0, right: 0 } : null;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_800ExtraBold,
  });

  if (!loaded && !error) return null;

  const app = (
    <SessionProvider>
      <ToastProvider>
        <StatusBar style="dark" />
        <RootStack />
      </ToastProvider>
    </SessionProvider>
  );
  return FRAME_INSETS ? <SafeAreaInsetsContext.Provider value={FRAME_INSETS}>{app}</SafeAreaInsetsContext.Provider> : app;
}

function RootStack() {
  const { user, loading } = useSession();
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);
  if (loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
