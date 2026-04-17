export const MAX_LEVEL = 5;

export function difficulty(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
  return Math.pow(1.55, clamped - 1);
}

export function levelLabel(level: number): string {
  return `Nivå ${level}/${MAX_LEVEL}`;
}
