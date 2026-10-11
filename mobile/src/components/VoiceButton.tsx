import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import * as api from '@/api';
import { colors, radius, space } from '@/theme';
import { useToast } from '@/toast';
import { Feather, T } from './ui';

type Props = { onTranscript: (text: string) => void; large?: boolean; style?: StyleProp<ViewStyle> };

/** Tap to talk, tap to stop. The words land in the text box so people can see and fix them. */
export function VoiceButton({ onTranscript, large = false, style }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const start = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return toast('Allow the microphone in your phone’s settings to speak to On Hold.');
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stop = async () => {
    await recorder.stop();
    setBusy(true);
    try {
      onTranscript(await api.transcribe(recorder.uri ?? ''));
    } catch {
      toast('We couldn’t hear that. Try again, or type it instead.');
    } finally {
      setBusy(false);
    }
  };

  const recording = state.isRecording;
  const seconds = Math.floor(state.durationMillis / 1000);
  const label = busy ? 'Listening…' : recording ? `Stop · ${seconds}s` : large ? 'Tap and tell us' : 'Speak';
  const fg = recording ? colors.white : colors.ink;

  return (
    <Pressable
      onPress={recording ? stop : start}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={recording ? 'Stop recording' : 'Speak instead of typing'}
      accessibilityState={{ busy }}
      style={({ pressed }) => [styles.button, large && styles.large, recording && styles.recording, pressed && { transform: [{ scale: 0.97 }] }, style]}>
      {busy ? <ActivityIndicator color={colors.ink} /> : <Feather name={recording ? 'square' : 'mic'} size={large ? 26 : 22} color={fg} />}
      <T v={large ? 'label' : 'small'} color={fg} style={large ? undefined : { fontSize: 14, lineHeight: 18 }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.grey,
    paddingHorizontal: space.sm,
  },
  large: { flexDirection: 'row', gap: space.sm + 2, minHeight: 64, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ink },
  recording: { backgroundColor: colors.stop, borderColor: colors.stop },
});
