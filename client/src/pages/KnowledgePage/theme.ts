export type ThemeName = 'light' | 'dark';

export interface ThemeNodeColors {
  blush: string;
  powder: string;
  mint: string;
  lavender: string;
  butter: string;
  peach: string;
  berry: string;
  seafoam: string;
}

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  icon: string;
  nodeColors: ThemeNodeColors;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  light: {
    name: 'light',
    label: '粉色奶油',
    icon: '🌸',
    nodeColors: {
      blush: '#FFC9DE',
      powder: '#C7DEFA',
      mint: '#B9E7D4',
      lavender: '#DCC9F7',
      butter: '#FFE7A8',
      peach: '#FFD4B8',
      berry: '#FFB8C9',
      seafoam: '#B8E8E0',
    },
  },
  dark: {
    name: 'dark',
    label: '暗夜可爱',
    icon: '🌙',
    nodeColors: {
      blush: '#7B4D6B',
      powder: '#4A5A7A',
      mint: '#4A7A6A',
      lavender: '#5E4E7E',
      butter: '#7A6A4A',
      peach: '#7A5A4A',
      berry: '#6E3A4A',
      seafoam: '#3E6A6A',
    },
  },
};

export const NODE_COLOR_KEYS: (keyof ThemeNodeColors)[] = [
  'blush',
  'powder',
  'mint',
  'lavender',
  'butter',
  'peach',
  'berry',
  'seafoam',
];

export const LIGHT_COLOR_TO_KEY: Record<string, keyof ThemeNodeColors> = {
  '#FFC9DE': 'blush',
  '#C7DEFA': 'powder',
  '#B9E7D4': 'mint',
  '#DCC9F7': 'lavender',
  '#FFE7A8': 'butter',
  '#FFD4B8': 'peach',
  '#FFB8C9': 'berry',
  '#B8E8E0': 'seafoam',
};

export function mapNodeColor(hexColor: string, theme: ThemeName): string {
  const key = LIGHT_COLOR_TO_KEY[hexColor];
  if (!key) return hexColor;
  return THEMES[theme].nodeColors[key];
}
