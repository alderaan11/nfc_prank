import { kv } from "@vercel/kv";

export interface Vote {
  choices: [string, string, string];
}

export interface GameResult {
  game: string;
  points: number;
}

const VOTES_KEY = "poll:votes";

export async function addVote(vote: Vote): Promise<void> {
  await kv.rpush(VOTES_KEY, JSON.stringify(vote));
}

export async function getResults(games: string[]): Promise<GameResult[]> {
  const rawVotes = await kv.lrange<string>(VOTES_KEY, 0, -1);
  const votes: Vote[] = rawVotes.map((v) =>
    typeof v === "string" ? JSON.parse(v) : v
  );

  const scores: Record<string, number> = Object.fromEntries(
    games.map((g) => [g, 0])
  );

  for (const vote of votes) {
    if (scores[vote.choices[0]] !== undefined) scores[vote.choices[0]] += 3;
    if (scores[vote.choices[1]] !== undefined) scores[vote.choices[1]] += 2;
    if (scores[vote.choices[2]] !== undefined) scores[vote.choices[2]] += 1;
  }

  return games
    .map((game) => ({ game, points: scores[game] }))
    .sort((a, b) => b.points - a.points);
}

export async function getVoteCount(): Promise<number> {
  return kv.llen(VOTES_KEY);
}
