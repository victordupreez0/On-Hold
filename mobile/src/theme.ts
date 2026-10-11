// Brand tokens from the pitch (slide 12). Yellow = tappable, ink = text,
// red/amber/green only ever mean a verdict (the SA "robot").
export const colors = {
  highlighter: '#FFE45C',
  highlighterDeep: '#E3C43A',
  ink: '#1A1A1A',
  inkSoft: '#55554F',
  grey: '#F4F4F1',
  line: '#E2E2DC',
  white: '#FFFFFF',
  stop: '#E0271F',
  wait: '#FFB400',
  safe: '#0A9A4A',
  stopTint: '#FDECEB',
  waitTint: '#FFF5DB',
  safeTint: '#E4F5EB',
} as const;

// Contrast: white on stop 4.7:1, ink on wait 9:1, white on safe 3.7:1 (large bold text only).
export const verdictStyle = {
  stop: { bg: colors.stop, fg: colors.white, tint: colors.stopTint, word: 'Stop', icon: 'octagon' },
  wait: { bg: colors.wait, fg: colors.ink, tint: colors.waitTint, word: 'Wait', icon: 'alert-triangle' },
  safe: { bg: colors.safe, fg: colors.white, tint: colors.safeTint, word: 'Looks okay', icon: 'check-circle' },
} as const;

export const font = {
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
  bold: 'AtkinsonHyperlegibleNext_800ExtraBold',
} as const;

export const type = {
  hero: { fontFamily: font.bold, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  title: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  heading: { fontFamily: font.semibold, fontSize: 21, lineHeight: 28 },
  body: { fontFamily: font.regular, fontSize: 18, lineHeight: 26 },
  label: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const minTouch = 48;
