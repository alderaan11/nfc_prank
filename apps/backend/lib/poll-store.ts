export interface Vote {
  choices: [string, string, string];
}

export interface GameResult {
  game: string;
  points: number;
}

const BLOB_PATHNAME = "poll-votes.json";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const STORE_ID = TOKEN.split("_")[3]; // extrait l'ID du store depuis le token

function blobApiUrl(path: string) {
  return `https://blob.vercel-storage.com/${path}`;
}

async function readVotes(): Promise<Vote[]> {
  try {
    // Lister les blobs pour trouver l'URL courante
    const res = await fetch(
      `https://blob.vercel-storage.com?prefix=${BLOB_PATHNAME}&limit=1`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    if (!res.ok) return [];
    const { blobs } = await res.json();
    if (!blobs || blobs.length === 0) return [];

    // Lire le contenu avec auth
    const download = await fetch(blobs[0].downloadUrl, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!download.ok) return [];
    return await download.json();
  } catch {
    return [];
  }
}

async function writeVotes(votes: Vote[]): Promise<void> {
  const res = await fetch(blobApiUrl(BLOB_PATHNAME), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "x-api-version": "7",
      "x-add-random-suffix": "0",
      "content-type": "application/json",
    },
    body: JSON.stringify(votes),
  });
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
