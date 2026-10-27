import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import * as api from '@/api';
import { BreathingRing } from '@/components/BreathingRing';
import { Button, Chip, Feather, Header, PageTitle, Screen, T, TextLink, type IconName } from '@/components/ui';
import { VoiceButton } from '@/components/VoiceButton';
import { useUser } from '@/session';
import { colors, minTouch, radius, space, type } from '@/theme';
import { useOnCall } from '@/useOnCall';

const PAUSE_MS = 3000; // the deliberate pause: never rush a verdict

const EXAMPLES = [
  { label: 'Traffic fine SMS', text: 'AARTO: Outstanding fine R500 for vehicle CA 123-456. Pay within 24hrs for 50% discount: aarto-pay.online' },
  { label: '“Hi Ma, new number”', text: 'Hi Ma, it’s me. My phone broke so this is my new number. Can you send R2,500 urgently? I’ll pay you back tomorrow' },
  { label: 'Birthday message', text: 'Happy birthday Ouma! See you at lunch on Sunday. Love you' },
];

type Phase = 'compose' | 'checking' | 'error';

export default function Ask() {
  const user = useUser();
  const params = useLocalSearchParams<{ mode?: string }>();
  const onCall = useOnCall();
  // Mode lives in the URL, so Home's "someone on the phone?" link can open Ask straight into call mode.
  const mode = params.mode === 'call' || onCall ? 'call' : 'message';
  const setMode = (next: 'call' | 'message') => router.setParams({ mode: next === 'call' ? 'call' : undefined });

  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; base64: string; mediaType: string } | null>(null);
  const [phase, setPhase] = useState<Phase>('compose');
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const canSubmit = text.trim().length > 0 || !!image;

  const submit = async () => {
    if (!canSubmit) return setError(mode === 'call' ? 'Tell us what the caller is saying first.' : 'Paste, type or share something to check first.');
    setError(null);
    setPhase('checking');
    try {
      const [result] = await Promise.all([
        api.check({ kind: mode, text: text.trim() || undefined, image: image ? { base64: image.base64, mediaType: image.mediaType } : undefined }),
        new Promise((r) => setTimeout(r, PAUSE_MS)),
      ]);
      const feel = {
        stop: Haptics.NotificationFeedbackType.Error,
        wait: Haptics.NotificationFeedbackType.Warning,
        safe: Haptics.NotificationFeedbackType.Success,
        info: Haptics.NotificationFeedbackType.Warning, // a scam warning shouldn't feel like an all-clear
      };
      Haptics.notificationAsync(feel[result.verdict]).catch(() => {});
      // Reset so coming back to the Check tab starts fresh.
      setText('');
      setImage(null);
      setPhase('compose');
      setShowExamples(false);
      router.push(`/check/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  };

  const paste = async () => {
    const pasted = await Clipboard.getStringAsync().catch(() => '');
    if (pasted) setText((t) => (t ? `${t}\n${pasted}` : pasted));
    else setError('Nothing is copied yet. Long-press the message, tap Copy, then come back.');
  };

  const pickScreenshot = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (!asset.base64) return setError('Couldn’t read that image. Try a different one.');
    setImage({ uri: asset.uri, base64: asset.base64, mediaType: asset.mimeType ?? 'image/jpeg' });
  };

  const addSpoken = (t: string) => setText((prev) => (prev ? `${prev} ${t}` : t));

  if (phase === 'checking') return <Pausing />;
  if (phase === 'error') return <CheckFailed message={error} onRetry={submit} onEdit={() => setPhase('compose')} />;

  const footer = <Button label="Check it" icon="arrow-right" onPress={submit} disabled={!canSubmit} />;
  const onCallMode = mode === 'call';

  return (
    <Screen footer={footer}>
      {/* Simple mode hides the tab bar, so this screen needs its own way back. */}
      {user.simpleMode && <Header />}
      <PageTitle
        title={onCallMode ? 'Help during a call' : 'Check something'}
        subtitle={onCallMode ? 'Tell us what the caller is saying or asking for.' : 'Paste it, share a screenshot or say it out loud.'}
      />

      {onCallMode ? (
        <CallTips onClose={() => setMode('message')} />
      ) : (
        <Pressable
          onPress={() => setMode('call')}
          accessibilityRole="button"
          accessibilityLabel="Someone on the phone with you right now? Get help during the call"
          style={({ pressed }) => [styles.callRow, pressed && { backgroundColor: colors.grey }]}>
          <View style={styles.callIcon}>
            <Feather name="phone-call" size={20} color={colors.ink} />
          </View>
          <T v="label" style={{ flex: 1 }}>
            Someone on the phone right now?
          </T>
          <Feather name="chevron-right" size={22} color={colors.inkSoft} />
        </Pressable>
      )}

      <View style={{ gap: space.sm + 2 }}>
        <View style={styles.inputWrap}>
          {image && (
            <View style={styles.preview}>
              <Image source={{ uri: image.uri }} style={styles.thumb} accessibilityLabel="Screenshot to check" />
              <T v="small" style={{ flex: 1 }}>
                Screenshot added
              </T>
              <Pressable onPress={() => setImage(null)} accessibilityRole="button" accessibilityLabel="Remove screenshot" style={styles.iconHit}>
                <Feather name="x" size={20} color={colors.ink} />
              </Pressable>
            </View>
          )}
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setError(null);
            }}
            multiline
            maxLength={4000}
            placeholder={onCallMode ? 'What are they saying? E.g. “He says he’s from my bank and needs the code they sent me”' : 'Paste or type the message here'}
            placeholderTextColor="#8A8A84"
            accessibilityLabel={onCallMode ? 'What is the caller saying?' : 'Message to check'}
            style={[styles.inputBare, onCallMode && { minHeight: 120 }]}
          />
        </View>

        <View style={styles.sources}>
          <Source icon="clipboard" label="Paste" onPress={paste} />
          <Source icon="image" label="Screenshot" onPress={pickScreenshot} />
          <VoiceButton onTranscript={addSpoken} style={{ flex: 1 }} />
        </View>
        <Problem text={error} />
      </View>

      {showExamples ? (
        <View style={{ gap: space.sm }}>
          <T v="overline" color={colors.inkSoft}>
            Try an example
          </T>
          <View style={styles.wrap}>
            {EXAMPLES.map((e) => (
              <Chip key={e.label} label={e.label} selected={text === e.text} onPress={() => setText(e.text)} />
            ))}
          </View>
        </View>
      ) : (
        <TextLink label="Not sure? Try an example" icon="help-circle" onPress={() => setShowExamples(true)} />
      )}
    </Screen>
  );
}

function Source({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.source, pressed && { transform: [{ scale: 0.97 }] }]}>
      <Feather name={icon} size={22} color={colors.ink} />
      <T v="small" style={{ fontSize: 14, lineHeight: 18 }}>
        {label}
      </T>
    </Pressable>
  );
}

function Problem({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.problem} accessibilityLiveRegion="polite">
      <Feather name="info" size={18} color={colors.stop} />
      <T v="small" color={colors.stop} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

/** Shown the moment someone says they're on a call: they're in charge, safety basics first, no AI wait. */
function CallTips({ onClose }: { onClose: () => void }) {
  const tips: [IconName, string][] = [
    ['pause-circle', 'You can always say “Please hold” and check here first.'],
    ['lock', 'Never share codes, PINs or passwords.'],
    ['smartphone', 'Don’t approve anything in your banking app.'],
    ['phone-off', 'It’s okay to hang up. A real bank will understand.'],
  ];
  return (
    <View style={styles.callPanel}>
      <View style={styles.basic}>
        <T v="overline" color={colors.highlighter} style={{ flex: 1 }}>
          On a call? You’re in charge
        </T>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="I’m not on a call" hitSlop={8} style={styles.close}>
          <Feather name="x" size={22} color={colors.white} />
        </Pressable>
      </View>
      {tips.map(([icon, line]) => (
        <View key={line} style={styles.basic}>
          <Feather name={icon} size={22} color={colors.highlighter} />
          <T v="label" color={colors.white} style={{ flex: 1 }}>
            {line}
          </T>
        </View>
      ))}
      <View style={styles.sayThis}>
        <T v="overline">You can say</T>
        <T v="heading" style={{ fontFamily: type.title.fontFamily }}>
          “I’ll phone you back on an official number.”
        </T>
      </View>
    </View>
  );
}

function CheckFailed({ message, onRetry, onEdit }: { message: string | null; onRetry: () => void; onEdit: () => void }) {
  return (
    <Screen footer={<Button label="Try again" icon="refresh-cw" onPress={onRetry} />}>
      <PageTitle title="Couldn’t check that" />
      <View style={styles.failCard} accessibilityLiveRegion="assertive">
        <View style={styles.basic}>
          <Feather name="alert-triangle" size={30} color={colors.ink} />
          <T v="title">Wait</T>
        </View>
        <T>Until you can check it, treat it as a scam: don’t pay or share any codes, and ask someone you trust.</T>
      </View>
      {message && (
        <T v="small" color={colors.inkSoft}>
          {message}
        </T>
      )}
      <Button label="Edit what I sent" variant="ghost" onPress={onEdit} />
    </Screen>
  );
}

const LINES = ['Looking for pressure tricks…', 'Checking any links…', 'Comparing with scams reported near you…'];
const LONGEST = LINES.reduce((a, b) => (b.length > a.length ? b : a));

function Pausing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % LINES.length), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center' }}>
      <BreathingRing size={230} durationMs={PAUSE_MS} />
      <View style={{ alignItems: 'center', gap: space.sm }} accessibilityLiveRegion="polite">
        <T v="title" style={{ textAlign: 'center' }}>
          Take a breath.
        </T>
        {/* The longest line, invisible, holds the height: when a line wraps to two, the centred ring would jump. */}
        <View>
          <T aria-hidden style={{ textAlign: 'center', opacity: 0 }}>
            {LONGEST}
          </T>
          <T color={colors.inkSoft} style={[StyleSheet.absoluteFill, { textAlign: 'center' }]}>
            {LINES[i]}
          </T>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  callIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.highlighter, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.white },
  inputBare: { ...type.body, color: colors.ink, minHeight: 168, paddingHorizontal: space.md, paddingVertical: space.md, textAlignVertical: 'top' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, paddingLeft: space.sm + 2, backgroundColor: colors.grey },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.line },
  iconHit: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  sources: { flexDirection: 'row', gap: space.sm },
  source: { flex: 1, minHeight: 64, borderRadius: radius.md, backgroundColor: colors.grey, alignItems: 'center', justifyContent: 'center', gap: 4 },
  problem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  callPanel: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.lg - 4, gap: space.md },
  basic: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  close: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center', margin: -space.sm - 4 },
  sayThis: { backgroundColor: colors.highlighter, borderRadius: radius.md, padding: space.md, gap: space.xs },
  failCard: { backgroundColor: colors.wait, borderRadius: radius.lg, padding: space.lg - 4, gap: space.sm + 2 },
});
