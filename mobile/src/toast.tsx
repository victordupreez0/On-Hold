import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space, type } from './theme';

const ToastContext = createContext<(message: string) => void>(() => {});

/** "Every action confirms what happened" (pitch, usability). One short message at a time. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const insets = useSafeAreaInsets();

  const show = (next: string) => {
    clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 3500);
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <View style={[styles.wrap, { bottom: insets.bottom + 96 }]}>
          <Text accessibilityLiveRegion="polite" role="status" style={styles.toast}>
            {message}
          </Text>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.md, right: space.md, alignItems: 'center', pointerEvents: 'none' },
  toast: {
    ...type.label,
    color: colors.white,
    backgroundColor: colors.ink,
    paddingHorizontal: space.lg,
    paddingVertical: space.md - 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    textAlign: 'center',
  },
});
