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

export type ResetResult = {
  ok: boolean;
  deleted: number;
  error?: string;
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

export async function resetScores(gameId: string | "all", pin: string): Promise<ResetResult> {
  const url = gameId === "all"
    ? "/api/highscores"
    : `/api/highscores/${encodeURIComponent(gameId)}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "x-admin-pin": pin },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        deleted: 0,
        error: typeof body.error === "string" ? body.error : "Kunne ikke nullstille",
      };
    }
    return {
      ok: true,
      deleted: typeof body.deleted === "number" ? body.deleted : 0,
    };
  } catch {
    return { ok: false, deleted: 0, error: "Ingen kontakt med server" };
  }
}
