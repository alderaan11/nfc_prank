export interface Vote {
  choices: [string, string, string];
}

export interface GameResult {
  game: string;
  points: number;
}

const BLOB_PATHNAME = "poll-votes.json";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";

async function readVotes(): Promise<Vote[]> {
  try {
    const res = await fetch(
      `https://blob.vercel-storage.com?prefix=${BLOB_PATHNAME}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    if (!res.ok) {
      console.error("[poll] list failed:", res.status, await res.text());
      return [];
    }
    const { blobs } = await res.json();
    if (!blobs || blobs.length === 0) return [];

    // Prendre le blob le plus récent
    const latest = blobs.sort(
      (a: { uploadedAt: string }, b: { uploadedAt: string }) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    // downloadUrl des stores privés est pré-signé — pas besoin de Bearer token
    const download = await fetch(latest.downloadUrl);
    if (!download.ok) {
      console.error("[poll] download failed:", download.status, latest.downloadUrl);
      return [];
    }
    return await download.json();
  } catch (e) {
    console.error("[poll] readVotes error:", e);
    return [];
  }
}

async function writeVotes(votes: Vote[]): Promise<void> {
  const res = await fetch(
    `https://blob.vercel-storage.com/${BLOB_PATHNAME}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "x-api-version": "7",
        "x-vercel-blob-access": "private",
        "x-add-random-suffix": "0",
        "x-allow-overwrite": "1",
        "content-type": "application/json",
      },
      body: JSON.stringify(votes),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blob write failed: ${res.status} ${text}`);
  }
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
