import { put, list } from "@vercel/blob";

export interface Vote {
  choices: [string, string, string];
}

export interface GameResult {
  game: string;
  points: number;
}

const BLOB_PATH = "poll-votes.json";

async function readVotes(): Promise<Vote[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].downloadUrl);
    return await res.json();
  } catch {
    return [];
  }
}

async function writeVotes(votes: Vote[]): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(votes), {
    access: "private",
    addRandomSuffix: false,
  });
}

export async function addVote(vote: Vote): Promise<void> {
  const votes = await readVotes();
  votes.push(vote);
  await writeVotes(votes);
}

export async function getResults(games: string[]): Promise<GameResult[]> {
  const votes = await readVotes();

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
  const votes = await readVotes();
  return votes.length;
}
