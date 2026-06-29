// Le compteur est encodé dans le pathname du blob : "prank-counter/42"
// → pas besoin de télécharger le contenu, une seule requête list suffit à lire.
// L'écriture se fait via next/server after() et ne bloque pas la réponse.

const PREFIX = "prank-counter/";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";

export async function readCounter(): Promise<number> {
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${PREFIX}&limit=20`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return 0;
  const { blobs } = await res.json();
  if (!blobs?.length) return 0;

  const latest = (blobs as { pathname: string; uploadedAt: string }[]).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )[0];

  const num = parseInt(latest.pathname.replace(PREFIX, ""), 10);
  return isNaN(num) ? 0 : num;
}

export async function writeCounter(index: number): Promise<void> {
  // Supprimer les anciens blobs de compteur
  const listRes = await fetch(
    `https://blob.vercel-storage.com?prefix=${PREFIX}&limit=20`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  if (listRes.ok) {
    const { blobs } = await listRes.json();
    if (blobs?.length) {
      await fetch("https://blob.vercel-storage.com", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ urls: (blobs as { url: string }[]).map((b) => b.url) }),
      });
    }
  }
  // Écrire le nouveau compteur — la valeur est dans le pathname, pas le contenu
  await fetch(`https://blob.vercel-storage.com/${PREFIX}${index}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "x-api-version": "7",
      "x-vercel-blob-access": "private",
      "content-type": "text/plain",
    },
    body: String(index),
  });
}
