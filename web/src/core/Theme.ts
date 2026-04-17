type Colors = {
  bg: number; bgSoft: number; panel: number; panelLight: number;
  accent: number; accent2: number; accent3: number;
  lavender: number; mint: number; pink: number; red: number;
  text: number; textSoft: number; textDim: number;
  good: number; bad: number;
};

const colors: Colors = {
  bg: 0x1a0f1f,
  bgSoft: 0x2a1b34,
  panel: 0x3a2550,
  panelLight: 0x5a3a78,
  accent: 0xffb7dd,
  accent2: 0xa0e7e5,
  accent3: 0xfbe5a4,
  lavender: 0xcdb4f6,
  mint: 0xb4f6d1,
  pink: 0xff8fcf,
  red: 0xff6b9a,
  text: 0xffffff,
  textSoft: 0xe8d5f0,
  textDim: 0x9a7db0,
  good: 0x7cffbc,
  bad: 0xff6b9a,
};

export const Theme = {
  colors,
  font: '"Zen Maru Gothic", system-ui, sans-serif',
  palette: {
    bgCss: "#1a0f1f",
    panelCss: "#3a2550",
    accentCss: "#ffb7dd",
  },
};

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function colorHex(c: number): string {
  return "#" + c.toString(16).padStart(6, "0");
}
