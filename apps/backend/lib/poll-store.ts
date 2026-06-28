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

    // Les stores privés retournent une url privée — Bearer token requis
    const download = await fetch(latest.url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!download.ok) {
      console.error("[poll] download failed:", download.status, latest.url);
      return [];
    }
    return await download.json();
  } catch (e) {
    console.error("[poll] readVotes error:", e);
    return [];
  }
}

async function deleteExistingBlobs(): Promise<void> {
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${BLOB_PATHNAME}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  if (!res.ok) return;
  const { blobs } = await res.json();
  if (!blobs || blobs.length === 0) return;
  await fetch("https://blob.vercel-storage.com", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ urls: blobs.map((b: { url: string }) => b.url) }),
  });
}

async function writeVotes(votes: Vote[]): Promise<void> {
  // Supprimer les anciens blobs AVANT d'écrire le nouveau pour éviter l'accumulation
  await deleteExistingBlobs();
  // Pas de x-add-random-suffix:0 → URL unique à chaque write → pas de cache CDN
  const res = await fetch(
    `https://blob.vercel-storage.com/${BLOB_PATHNAME}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "x-api-version": "7",
        "x-vercel-blob-access": "private",
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
