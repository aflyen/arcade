export type ScoreEntry = {
  rank: number;
  name: string;
  score: number;
  createdAt: string;
};

export type SubmitResult = {
  ok: boolean;
  rank: number;
  isTop10: boolean;
};

export async function fetchTop(gameId: string): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(`/api/highscores/${encodeURIComponent(gameId)}`);
    if (!res.ok) return [];
    return (await res.json()) as ScoreEntry[];
  } catch {
    return [];
  }
}

export async function submitScore(
  gameId: string,
  name: string,
  score: number,
): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/highscores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, name, score: Math.round(score) }),
    });
    if (!res.ok) return { ok: false, rank: 999, isTop10: false };
    return (await res.json()) as SubmitResult;
  } catch {
    return { ok: false, rank: 999, isTop10: false };
  }
}

export async function checkIfTop10(gameId: string, score: number): Promise<boolean> {
  const top = await fetchTop(gameId);
  if (top.length < 10) return score > 0;
  const last = top[top.length - 1];
  return score > last.score;
}
