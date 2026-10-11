import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import * as api from '@/api';
import { BreathingRing } from '@/components/BreathingRing';
import { Button, Chip, Feather, Header, Screen, T, type IconName } from '@/components/ui';
import { VoiceButton } from '@/components/VoiceButton';
import { colors, minTouch, radius, space, type } from '@/theme';
import type { CheckInput } from '@/types';
import { useOnCall } from '@/useOnCall';

const PAUSE_MS = 3000; // the deliberate pause: never rush a verdict

const EXAMPLES = [
  { label: 'Traffic fine SMS', text: 'AARTO: Outstanding fine R500 for vehicle CA 123-456. Pay within 24hrs for 50% discount: aarto-pay.online' },
  { label: '“Hi Ma, new number”', text: 'Hi Ma, it’s me. My phone broke so this is my new number. Can you send R2,500 urgently? I’ll pay you back tomorrow' },
  { label: 'Birthday message', text: 'Happy birthday Ouma! See you at lunch on Sunday. Love you' },
];

type Phase = 'compose' | 'checking' | 'error';

export default function Ask() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const onCall = useOnCall();
  const [mode, setMode] = useState<CheckInput['kind']>(params.mode === 'call' || onCall ? 'call' : 'message');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('compose');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = text.trim().length > 0 || !!image;

  const submit = async () => {
    if (!canSubmit) return setError(mode === 'call' ? 'Tell us what the caller is saying first.' : 'Paste, type or share something to check first.');
    setError(null);
    setPhase('checking');
    try {
      const [result] = await Promise.all([
        api.check({ kind: mode, text: text.trim() || undefined, imageUri: image ?? undefined }),
        new Promise((r) => setTimeout(r, PAUSE_MS)),
      ]);
      const feel = { stop: Haptics.NotificationFeedbackType.Error, wait: Haptics.NotificationFeedbackType.Warning, safe: Haptics.NotificationFeedbackType.Success };
      Haptics.notificationAsync(feel[result.verdict]).catch(() => {});
      router.replace(`/check/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  };

  const paste = async () => {
    const pasted = await Clipboard.getStringAsync().catch(() => '');
    if (pasted) setText((t) => (t ? `${t}\n${pasted}` : pasted));
    else setError('There’s nothing copied yet. Long-press the message, tap Copy, then come back.');
  };

  const pickScreenshot = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) setImage(res.assets[0].uri);
  };

  if (phase === 'checking') return <Pausing />;

  if (phase === 'error') {
    return (
      <Screen footer={<Button label="Try again" icon="refresh-cw" onPress={submit} />}>
        <Header onBack={() => setPhase('compose')} />
        <View style={styles.errorCard} accessibilityLiveRegion="assertive">
          <View style={styles.row}>
            <Feather name="alert-triangle" size={34} color={colors.ink} />
            <T v="hero" style={{ fontSize: 40 }}>
              Wait
            </T>
          </View>
          <T v="heading">We couldn’t check this right now.</T>
          <T>Treat it as Wait: don’t pay or share any codes until you’ve checked with someone you trust.</T>
        </View>
        <T v="small" color={colors.inkSoft}>
          {error}
        </T>
        <Button label="Edit what I sent" variant="ghost" onPress={() => setPhase('compose')} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Composer
          mode={mode}
          text={text}
          onText={(t) => {
            setText(t);
            setError(null);
          }}
          image={image}
          onClearImage={() => setImage(null)}
          onPaste={paste}
          onScreenshot={pickScreenshot}
          onTranscript={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))}
          onSubmit={submit}
          canSubmit={canSubmit}
        />
      }>
      <Header title={mode === 'call' ? 'Help during a call' : 'Check something'} />

      {mode === 'message' ? (
        <>
          <Pressable
            onPress={() => setMode('call')}
            accessibilityRole="button"
            accessibilityLabel="Someone on the phone with you right now? Tap here"
            style={styles.callStrip}>
            <Feather name="phone-call" size={22} color={colors.ink} />
            <T v="label" style={{ flex: 1 }}>
              Someone on the phone with you right now? Tap here.
            </T>
            <Feather name="chevron-right" size={22} color={colors.ink} />
          </Pressable>
          <T color={colors.inkSoft}>
            Paste or type the message below, share a screenshot, or tap the microphone and tell us about it.
          </T>
          <View style={{ gap: space.sm }}>
            <T v="label">Not sure how? Try an example</T>
            <View style={styles.wrap}>
              {EXAMPLES.map((e) => (
                <Chip key={e.label} label={e.label} selected={text === e.text} onPress={() => setText(e.text)} />
              ))}
            </View>
          </View>
        </>
      ) : (
        <CallHelp onNotOnCall={() => setMode('message')} />
      )}

      {error && (
        <View style={styles.row} accessibilityLiveRegion="polite">
          <Feather name="info" size={18} color={colors.stop} />
          <T v="small" color={colors.stop} style={{ flex: 1 }}>
            {error}
          </T>
        </View>
      )}
    </Screen>
  );
}

/** Shown the moment someone says they're on a call: safety basics first, no AI wait. */
function CallHelp({ onNotOnCall }: { onNotOnCall: () => void }) {
  const basics: [IconName, string][] = [
    ['lock', 'Don’t share codes, PINs or passwords.'],
    ['smartphone', 'Don’t approve anything in your banking app.'],
    ['phone-off', 'It’s okay to hang up. A real bank or office will understand.'],
  ];
  return (
    <>
      <View style={styles.callPanel}>
        <T v="label" color={colors.highlighter}>
          WHILE YOU’RE ON THE CALL
        </T>
        {basics.map(([icon, line]) => (
          <View key={line} style={styles.row}>
            <Feather name={icon} size={24} color={colors.highlighter} />
            <T v="heading" color={colors.white} style={{ flex: 1 }}>
              {line}
            </T>
          </View>
        ))}
        <View style={styles.sayThis}>
          <T v="small" color={colors.ink} style={{ fontFamily: type.label.fontFamily }}>
            You can say:
          </T>
          <T v="heading" style={{ fontFamily: type.title.fontFamily }}>
            “I’ll phone you back on an official number.”
          </T>
        </View>
      </View>
      <T color={colors.inkSoft}>Then tell us what they’re saying or asking for. Tap the microphone, or type it below.</T>
      <Pressable onPress={onNotOnCall} accessibilityRole="button" style={{ minHeight: minTouch, justifyContent: 'center' }}>
        <T v="label" style={{ textDecorationLine: 'underline' }}>
          I’m not on a call. Check a message instead.
        </T>
      </Pressable>
    </>
  );
}

type ComposerProps = {
  mode: CheckInput['kind'];
  text: string;
  onText: (t: string) => void;
  image: string | null;
  onClearImage: () => void;
  onPaste: () => void;
  onScreenshot: () => void;
  onTranscript: (t: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

/** Pinned to the bottom like WhatsApp's composer, a pattern older users already know. */
function Composer(p: ComposerProps) {
  return (
    <View style={{ gap: space.sm }}>
      {p.image && (
        <View style={styles.preview}>
          <Image source={{ uri: p.image }} style={styles.thumb} accessibilityLabel="Screenshot to check" />
          <T v="small" style={{ flex: 1 }}>
            Screenshot added
          </T>
          <Pressable onPress={p.onClearImage} accessibilityRole="button" accessibilityLabel="Remove screenshot" style={styles.toolButton}>
            <Feather name="x" size={22} color={colors.ink} />
          </Pressable>
        </View>
      )}
      <TextInput
        value={p.text}
        onChangeText={p.onText}
        multiline
        placeholder={p.mode === 'call' ? 'e.g. “He says he’s from my bank and needs the code they sent me”' : 'Paste or type the message here'}
        placeholderTextColor="#8A8A84"
        accessibilityLabel={p.mode === 'call' ? 'What is the caller saying?' : 'Message to check'}
        style={styles.input}
      />
      <View style={styles.tools}>
        {p.mode === 'message' && (
          <>
            <Tool icon="clipboard" label="Paste" onPress={p.onPaste} />
            <Tool icon="image" label="Screenshot" onPress={p.onScreenshot} />
          </>
        )}
        <VoiceButton onTranscript={p.onTranscript} large={p.mode === 'call'} />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={p.onSubmit}
          accessibilityRole="button"
          accessibilityLabel="Check it"
          accessibilityState={{ disabled: !p.canSubmit }}
          style={[styles.send, !p.canSubmit && { opacity: 0.45 }]}>
          <T v="label" color={colors.white}>
            Check
          </T>
          <Feather name="arrow-right" size={22} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

function Tool({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.tool}>
      <Feather name={icon} size={22} color={colors.ink} />
      <T v="small" style={{ fontSize: 13, lineHeight: 16 }}>
        {label}
      </T>
    </Pressable>
  );
}

const LINES = ['Looking for pressure tricks…', 'Checking any links…', 'Comparing with scams reported near you…'];

function Pausing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % LINES.length), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <BreathingRing size={Platform.OS === 'web' ? 220 : 240} durationMs={PAUSE_MS} />
      <View style={{ alignItems: 'center', gap: space.sm }} accessibilityLiveRegion="polite">
        <T v="title" style={{ textAlign: 'center' }}>
          Take a breath.
        </T>
        <T color={colors.inkSoft} style={{ textAlign: 'center' }}>
          {LINES[i]}
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  callStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    minHeight: 60,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.highlighter,
  },
  callPanel: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.lg - 4, gap: space.md },
  sayThis: { backgroundColor: colors.highlighter, borderRadius: radius.md, padding: space.md, gap: 2 },
  errorCard: { backgroundColor: colors.wait, borderRadius: radius.lg, padding: space.lg, gap: space.sm + 2 },
  input: {
    ...type.body,
    color: colors.ink,
    minHeight: 96,
    maxHeight: 200,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    textAlignVertical: 'top',
    backgroundColor: colors.white,
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tool: { minWidth: 64, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.sm, backgroundColor: colors.grey, paddingHorizontal: 6 },
  toolButton: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  send: {
    minHeight: 56,
    paddingHorizontal: space.lg - 4,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.grey, borderRadius: radius.md, padding: space.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.line },
});
