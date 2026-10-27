// Brand tokens from the pitch (slide 12). Yellow = the one thing to tap, ink = text,
// red/amber/green only ever mean a verdict (the SA "robot").
export const colors = {
  highlighter: '#FFE45C',
  highlighterDeep: '#E3C43A',
  ink: '#1A1A1A',
  inkSoft: '#55554F',
  grey: '#F4F4F1',
  line: '#E2E2DC',
  hairline: '#E8E8E2',
  white: '#FFFFFF',
  stop: '#E0271F',
  wait: '#FFB400',
  safe: '#0A9A4A',
  stopTint: '#FDECEB',
  waitTint: '#FFF5DB',
  safeTint: '#E4F5EB',
} as const;

// Map heat: brand yellow through orange. Deliberately not verdict red, so "lots of reports"
// never reads as a verdict on someone's message.
export const heat = ['#FFE45C', '#FFB02E', '#F2711C'] as const;

/** Colour along the heat ramp for intensity t (0..1), as rgba with the given alpha. */
export function heatRgba(t: number, alpha: number) {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = Math.max(0, Math.min(1, t)) * (heat.length - 1);
  const i = Math.min(Math.floor(x), heat.length - 2);
  const [a, b] = [hex(heat[i]), hex(heat[i + 1])];
  const [r, g, bl] = a.map((v, k) => Math.round(v + (b[k] - v) * (x - i)));
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

// Contrast: white on stop 4.7:1, ink on wait 9:1, white on safe 3.7:1 (large bold text only), white on info 7.6:1.
// info is grey, never green: a warning poster about a scam must not read as "that kind of message is fine".
export const verdictStyle = {
  stop: { bg: colors.stop, fg: colors.white, tint: colors.stopTint, word: 'Stop', icon: 'octagon' },
  wait: { bg: colors.wait, fg: colors.ink, tint: colors.waitTint, word: 'Wait', icon: 'alert-triangle' },
  safe: { bg: colors.safe, fg: colors.white, tint: colors.safeTint, word: 'Looks okay', icon: 'check-circle' },
  info: { bg: colors.inkSoft, fg: colors.white, tint: colors.grey, word: 'Scam warning', icon: 'info' },
} as const;

export const font = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
  bold: 'AtkinsonHyperlegibleNext_800ExtraBold',
} as const;

// One clear scale: display for the single hero line, title per screen, overline for quiet section labels.
export const type = {
  hero: { fontFamily: font.bold, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  display: { fontFamily: font.bold, fontSize: 34, lineHeight: 39, letterSpacing: -0.8 },
  title: { fontFamily: font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  heading: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: font.regular, fontSize: 18, lineHeight: 26 },
  label: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22 },
  small: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  overline: { fontFamily: font.semibold, fontSize: 13, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' },
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const minTouch = 48;
