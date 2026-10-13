import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Children, Fragment, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, minTouch, radius, space, type } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];
export { Feather };

const pressScale = ({ pressed }: { pressed: boolean }) => (pressed ? { transform: [{ scale: 0.98 }] } : null);

// ---------- Text ----------

export function T({ v = 'body', color = colors.ink, style, ...rest }: TextProps & { v?: keyof typeof type; color?: string }) {
  return <Text {...rest} style={[type[v], { color }, style]} />;
}

// ---------- Layout ----------

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  /** Tab screens only need the top inset; the tab bar handles the bottom. */
  edges?: ('top' | 'bottom')[];
  style?: StyleProp<ViewStyle>;
  background?: string;
};

/** Safe-area page with a centred max width, so the web preview reads like a phone. */
export function Screen({ children, scroll = true, footer, edges = ['top'], style, background = colors.white }: ScreenProps) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.pad, style]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.pad, { flex: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.column}>
        {body}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Large title for the root of each tab. */
export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <View style={{ flex: 1, gap: space.xs }}>
        <T v="title" role="heading">
          {title}
        </T>
        {subtitle && <T color={colors.inkSoft}>{subtitle}</T>}
      </View>
      {right}
    </View>
  );
}

/** Back bar for screens pushed inside a tab. */
export function Header({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={styles.header}>
      <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
        <Feather name="chevron-left" size={28} color={colors.ink} />
      </Pressable>
      {title ? (
        <T v="heading" style={{ flex: 1 }} numberOfLines={1} role="heading">
          {title}
        </T>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

// ---------- Controls ----------

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const BUTTON = {
  primary: { bg: colors.highlighter, fg: colors.ink },
  secondary: { bg: colors.grey, fg: colors.ink },
  ghost: { bg: colors.white, fg: colors.ink },
  danger: { bg: colors.stop, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.white },
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style, accessibilityHint }: ButtonProps) {
  const c = BUTTON[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={(state) => [styles.button, { backgroundColor: c.bg, opacity: off ? 0.45 : 1 }, variant === 'ghost' && styles.ghost, !off && pressScale(state), style]}>
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={22} color={c.fg} />}
          <T v="label" color={c.fg} style={{ fontSize: 18 }}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, onPress, style, accessibilityLabel }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={(state) => [styles.card, pressScale(state), style]}>
      {children}
    </Pressable>
  );
}

/** A quiet grouped list (iOS-settings style): one bordered surface, hairline dividers, no card soup. */
export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconBg?: string;
  iconColor?: string;
  leading?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ListRow({ title, subtitle, icon, iconBg = colors.grey, iconColor = colors.ink, leading, right, onPress, accessibilityLabel }: RowProps) {
  const content = (
    <>
      {leading ??
        (icon && (
          <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
            <Feather name={icon} size={20} color={iconColor} />
          </View>
        ))}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{title}</T>
        {subtitle && (
          <T v="small" color={colors.inkSoft}>
            {subtitle}
          </T>
        )}
      </View>
      {right}
      {onPress && <Feather name="chevron-right" size={22} color={colors.inkSoft} />}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.grey }]}>
      {content}
    </Pressable>
  );
}

export function Pill({ label, bg = colors.grey, fg = colors.ink, icon }: { label: string; bg?: string; fg?: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon && <Feather name={icon} size={14} color={fg} />}
      <T v="small" color={fg} style={{ fontFamily: type.label.fontFamily, fontSize: 14 }}>
        {label}
      </T>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={(state) => [styles.chip, selected ? styles.chipOn : styles.chipOff, pressScale(state)]}>
      {icon && <Feather name={icon} size={18} color={colors.ink} />}
      <T v="label" style={{ fontSize: 16 }}>
        {label}
      </T>
    </Pressable>
  );
}

/** A labelled on/off row. One control, so screen readers announce it once. */
export function Toggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={detail}
      style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{label}</T>
        <T v="small" color={colors.inkSoft}>
          {detail}
        </T>
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string };

export function TextField({ label, error, hint, style, multiline, ...rest }: FieldProps) {
  return (
    <View style={{ gap: space.xs + 2 }}>
      <T v="label">{label}</T>
      {hint && (
        <T v="small" color={colors.inkSoft}>
          {hint}
        </T>
      )}
      <TextInput
        {...rest}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor="#8A8A84"
        style={[styles.input, multiline && { minHeight: 120, textAlignVertical: 'top' }, error ? styles.inputError : null, style]}
      />
      {error && (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={16} color={colors.stop} />
          <T v="small" color={colors.stop} style={{ flex: 1 }}>
            {error}
          </T>
        </View>
      )}
    </View>
  );
}

// ---------- States ----------

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.ink} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { gap: space.md }]}>
      <Feather name="cloud-off" size={36} color={colors.inkSoft} />
      <T style={{ textAlign: 'center' }}>{message}</T>
      {onRetry && <Button label="Try again" variant="secondary" icon="refresh-cw" onPress={onRetry} />}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={28} color={colors.ink} />
      </View>
      <T v="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T color={colors.inkSoft} style={{ textAlign: 'center' }}>
        {body}
      </T>
      {action}
    </View>
  );
}

/** Quiet uppercase label over a group, so content leads and headings don't shout. */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm + 2 }}>
      <View style={styles.sectionHead}>
        <T v="overline" color={colors.inkSoft} role="heading">
          {title}
        </T>
        {action}
      </View>
      {children}
    </View>
  );
}

export function TextLink({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [styles.textLink, pressed && { opacity: 0.6 }]}>
      {icon && <Feather name={icon} size={18} color={colors.ink} />}
      <T v="label" style={{ textDecorationLine: 'underline' }}>
        {label}
      </T>
    </Pressable>
  );
}

export const hoursSince = (iso: string) => (Date.now() - Date.parse(iso)) / 3_600_000;

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

const styles = StyleSheet.create({
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  pad: { paddingHorizontal: space.lg - 4, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.lg + 4, flexGrow: 1 },
  footer: { paddingHorizontal: space.lg - 4, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm },
  pageTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingTop: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: minTouch, marginBottom: -space.sm },
  iconButton: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center', marginLeft: -space.md + 2 },
  button: {
    minHeight: 58,
    borderRadius: radius.md + 2,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  ghost: { borderWidth: 1.5, borderColor: colors.line },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, padding: space.md + 2, gap: space.sm },
  group: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 72 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 68, paddingHorizontal: space.md, paddingVertical: space.sm + 4 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  chip: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipOn: { backgroundColor: colors.highlighter, borderColor: colors.ink },
  chipOff: { backgroundColor: colors.white, borderColor: colors.line },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  track: { width: 56, height: 32, borderRadius: 16, backgroundColor: colors.line, padding: 3 },
  trackOn: { backgroundColor: colors.ink },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  knobOn: { backgroundColor: colors.highlighter, transform: [{ translateX: 24 }] },
  input: {
    ...type.body,
    color: colors.ink,
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.stop },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, minHeight: 200 },
  empty: { alignItems: 'center', gap: space.sm + 2, paddingVertical: space.xl, paddingHorizontal: space.md },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.highlighter, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 },
  textLink: { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
