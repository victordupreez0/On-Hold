import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import * as api from '@/api';
import { colors, radius, space } from '@/theme';
import { useToast } from '@/toast';
import { Feather, T } from './ui';

type Props = { onTranscript: (text: string) => void; style?: StyleProp<ViewStyle> };

/** Two minutes at this preset is about 2MB, well under the server's 5MB cap. */
const MAX_SECONDS = 120;

/** The finished recording as base64. Web hands back a blob: URL, native a file in the app's cache. */
async function readRecording(uri: string): Promise<{ base64: string; mimeType?: string }> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    URL.revokeObjectURL(uri);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType: blob.type || undefined };
  }
  const file = new File(uri);
  try {
    return { base64: await file.base64() };
  } finally {
    if (file.exists) file.delete(); // what was said on the call shouldn't stay on the phone
  }
}

/** Tap to talk, tap to stop. The words land in the text box so people can see and fix them. */
export function VoiceButton({ onTranscript, style }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const start = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return toast('Allow the microphone in your phone’s settings to speak to On Hold.');
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      toast('Couldn’t start recording. Try again, or type it instead.');
    }
  };

  const stop = async () => {
    setBusy(true); // first, so a second tap or the time limit can't stop it twice
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('No recording');
      const { base64, mimeType } = await readRecording(recorder.uri);
      onTranscript(await api.transcribe(base64, mimeType));
    } catch (e) {
      // The server's messages are written for people ("We didn’t catch any words…"); anything else gets a plain one.
      toast(e instanceof api.ApiError ? e.message : 'We couldn’t hear that. Try again, or type it instead.');
    } finally {
      setBusy(false);
    }
  };

  // Stop on its own at the limit, rather than record something too long to send.
  useEffect(() => {
    if (!state.isRecording || busy) return;
    const timer = setTimeout(stop, MAX_SECONDS * 1000 - state.durationMillis);
    return () => clearTimeout(timer);
  });

  const recording = state.isRecording;
  const seconds = Math.floor(state.durationMillis / 1000);
  const label = busy ? 'Listening…' : recording ? `Stop · ${seconds}s` : 'Speak';
  const fg = recording ? colors.white : colors.ink;

  return (
    <Pressable
      onPress={recording ? stop : start}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={recording ? 'Stop recording' : 'Speak instead of typing'}
      accessibilityState={{ busy }}
      style={({ pressed }) => [styles.button, recording && styles.recording, pressed && { transform: [{ scale: 0.97 }] }, style]}>
      {busy ? <ActivityIndicator color={colors.ink} /> : <Feather name={recording ? 'square' : 'mic'} size={22} color={fg} />}
      <T v="small" color={fg} style={{ fontSize: 14, lineHeight: 18 }}>
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
  recording: { backgroundColor: colors.stop, borderColor: colors.stop },
});
