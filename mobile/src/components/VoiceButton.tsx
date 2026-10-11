import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import * as api from '@/api';
import { colors, radius, space } from '@/theme';
import { useToast } from '@/toast';
import { Feather, T } from './ui';

/** Tap to talk, tap to stop. The words land in the composer so people can see and fix them. */
export function VoiceButton({ onTranscript, large = false }: { onTranscript: (text: string) => void; large?: boolean }) {
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
  const label = busy ? 'Listening back…' : recording ? `Stop (${seconds}s)` : large ? 'Tap and speak' : 'Speak';

  return (
    <Pressable
      onPress={recording ? stop : start}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={recording ? 'Stop recording' : 'Speak instead of typing'}
      accessibilityState={{ busy }}
      style={[styles.button, large && styles.large, recording && styles.recording]}>
      {busy ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Feather name={recording ? 'square' : 'mic'} size={large ? 26 : 22} color={recording ? colors.white : colors.ink} />
      )}
      <T v="small" color={recording ? colors.white : colors.ink} style={{ fontSize: large ? 15 : 13, lineHeight: 18 }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 64,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.grey,
    paddingHorizontal: 6,
  },
  large: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md, backgroundColor: colors.highlighter, borderWidth: 2, borderColor: colors.ink },
  recording: { backgroundColor: colors.stop, borderColor: colors.stop },
});
