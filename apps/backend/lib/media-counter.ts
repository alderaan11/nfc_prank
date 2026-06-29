const COUNTER_PATH = "prank-counter.json";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";

async function readCounter(): Promise<number> {
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${COUNTER_PATH}`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return 0;
  const { blobs } = await res.json();
  if (!blobs?.length) return 0;

  const latest = blobs.sort(
    (a: { uploadedAt: string }, b: { uploadedAt: string }) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )[0];

  const dl = await fetch(latest.url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!dl.ok) return 0;
  const data = await dl.json();
  return typeof data.index === "number" ? data.index : 0;
}

async function deleteCounterBlobs(): Promise<void> {
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${COUNTER_PATH}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  if (!res.ok) return;
  const { blobs } = await res.json();
  if (!blobs?.length) return;
  await fetch("https://blob.vercel-storage.com", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ urls: blobs.map((b: { url: string }) => b.url) }),
  });
}

async function writeCounter(index: number): Promise<void> {
  await deleteCounterBlobs();
  await fetch(`https://blob.vercel-storage.com/${COUNTER_PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "x-api-version": "7",
      "x-vercel-blob-access": "private",
      "content-type": "application/json",
    },
    body: JSON.stringify({ index }),
  });
}

// Retourne l'index courant et sauvegarde le suivant en Blob.
export async function getAndIncrementIndex(total: number): Promise<number> {
  const current = await readCounter();
  const safe = current % total; // reste valide si des médias ont été supprimés
  const next = (safe + 1) % total;
  await writeCounter(next);
  return safe;
}
