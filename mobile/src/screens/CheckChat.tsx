import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import * as api from '@/api';
import { Logo } from '@/components/Logo';
import { Feather, Header, Screen, T } from '@/components/ui';
import { useUser } from '@/session';
import { colors, minTouch, radius, space, type, verdictStyle } from '@/theme';
import type { ChatMessage, CheckResult } from '@/types';
import { useLoad } from '@/useLoad';

const SUGGESTIONS = {
  risky: ['What if they contact me again?', 'I already replied or clicked. What now?', 'Who should I tell about this?'],
  safe: ['How can I be sure it’s real?', 'What would make this a scam?'],
  info: ['How do I spot this scam?', 'What do I do if I get one?'],
};

/** A follow-up chat about one check, saved so it shows up again from History. */
export default function CheckChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser();
  const check = useLoad(() => api.getCheck(id), id);
  const saved = useLoad(() => api.listCheckMessages(id), id);
  // Local copy once the person starts typing, so sends show instantly; until then, what's saved.
  const [local, setLocal] = useState<ChatMessage[] | null>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  const messages = local ?? saved.data ?? [];

  const send = async (text = question.trim()) => {
    if (!text || busy) return;
    const now = new Date().toISOString();
    const withQuestion = [...messages, { role: 'user', content: text, createdAt: now } satisfies ChatMessage];
    setLocal(withQuestion);
    setQuestion('');
    setError(null);
    setBusy(true);
    try {
      const answer = await api.askAboutCheck(id, text);
      setLocal([...withQuestion, { role: 'assistant', content: answer, createdAt: new Date().toISOString() }]);
    } catch (e) {
      // Nothing was saved -- take the question back out and put it in the box to retry.
      setLocal(messages);
      setQuestion(text);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const composer = (
    <View style={{ gap: space.xs }}>
      {error && (
        <T v="small" color={colors.stop} accessibilityLiveRegion="polite">
          {error}
        </T>
      )}
      <View style={styles.composer}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a question…"
          placeholderTextColor="#8A8A84"
          accessibilityLabel="Ask a question about this"
          multiline
          maxLength={500}
          style={styles.input}
        />
        <Pressable
          onPress={() => send()}
          disabled={!question.trim() || busy}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [styles.send, (!question.trim() || busy) && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.94 }] }]}>
          {busy ? <ActivityIndicator color={colors.ink} /> : <Feather name="arrow-up" size={24} color={colors.ink} />}
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen scroll={false} footer={composer} style={{ gap: 0, paddingBottom: 0 }}>
      <Header title="Ask On Hold" />
      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.thread}>
        {check.data && <Context check={check.data} />}

        <Bubble role="assistant">
          Hi {user.name}. I’ve looked at this {check.data?.kind === 'call' ? 'call' : 'message'} with you. Ask me anything about it, in your own words.
        </Bubble>

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content}
          </Bubble>
        ))}

        {busy && <Typing />}

        {!saved.data && !saved.error ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: space.md }} />
        ) : (
          !messages.length &&
          !busy &&
          check.data && (
            <View style={styles.suggestions}>
              {SUGGESTIONS[check.data.verdict === 'safe' || check.data.verdict === 'info' ? check.data.verdict : 'risky'].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask: ${s}`}
                  style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.highlighter }]}>
                  <T v="label" style={{ fontSize: 16 }}>
                    {s}
                  </T>
                </Pressable>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </Screen>
  );
}

/** Which check this chat is about, so the thread never floats free of its verdict. */
function Context({ check }: { check: CheckResult }) {
  const v = verdictStyle[check.verdict];
  return (
    <View style={[styles.context, { backgroundColor: v.tint }]}>
      <View style={[styles.contextIcon, { backgroundColor: v.bg }]}>
        <Feather name={v.icon} size={16} color={v.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="overline" color={colors.inkSoft}>
          {v.word}
        </T>
        <T v="label" numberOfLines={2}>
          {check.headline}
        </T>
      </View>
    </View>
  );
}

function Bubble({ role, children }: { role: ChatMessage['role']; children: ReactNode }) {
  if (role === 'user') {
    return (
      <View style={[styles.bubble, styles.mine]}>
        <T color={colors.white}>{children}</T>
      </View>
    );
  }
  return (
    <View style={styles.theirsRow}>
      <View style={styles.avatar}>
        <Logo size={24} onYellow />
      </View>
      <View style={[styles.bubble, styles.theirs]}>
        <T>{children}</T>
      </View>
    </View>
  );
}

/** Three dots taking turns, so a wait reads as "typing", not "stuck". */
function Typing() {
  const [on, setOn] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setOn((n) => (n + 1) % 3), 350);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.theirsRow} accessibilityLabel="On Hold is typing" accessibilityLiveRegion="polite">
      <View style={styles.avatar}>
        <Logo size={24} onYellow />
      </View>
      <View style={[styles.bubble, styles.theirs, styles.typing]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.typingDot, i === on && { backgroundColor: colors.ink }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: space.sm + 4, paddingTop: space.md, paddingBottom: space.lg },
  context: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4, padding: space.sm + 4, borderRadius: radius.md, marginBottom: space.xs },
  contextIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  theirsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, maxWidth: '92%' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.highlighter, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: space.md, paddingVertical: space.sm + 4, borderRadius: 22, flexShrink: 1 },
  theirs: { backgroundColor: colors.grey, borderBottomLeftRadius: 6 },
  mine: { backgroundColor: colors.ink, borderBottomRightRadius: 6, alignSelf: 'flex-end', maxWidth: '84%' },
  typing: { flexDirection: 'row', gap: 6, paddingVertical: space.md + 2 },
  typingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.line },
  suggestions: { alignItems: 'flex-end', gap: space.sm, marginTop: space.xs },
  suggestion: {
    minHeight: minTouch,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    padding: 6,
    paddingLeft: space.md,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  input: { ...type.body, flex: 1, color: colors.ink, minHeight: 44, maxHeight: 132, paddingTop: 9, paddingBottom: 9 },
  send: { width: minTouch, height: minTouch, borderRadius: minTouch / 2, backgroundColor: colors.highlighter, alignItems: 'center', justifyContent: 'center' },
});
