import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Clé AES-256 dérivée du Blob token — jamais exposée côté client
const KEY = createHash("sha256")
  .update(process.env.BLOB_READ_WRITE_TOKEN ?? "dev-fallback-key")
  .digest();

const TTL_MS = 5 * 60 * 1000; // token valide 5 minutes

export function encryptMediaToken(blobUrl: string): string {
  const payload = `${Date.now()}|${blobUrl}`;
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString("base64url");
}

export function decryptMediaToken(token: string): string | null {
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, 16);
    const encrypted = buf.subarray(16);
    const decipher = createDecipheriv("aes-256-cbc", KEY, iv);
    const payload = decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
    const sep = payload.indexOf("|");
    const ts = parseInt(payload.slice(0, sep), 10);
    if (isNaN(ts) || Date.now() - ts > TTL_MS) return null;
    return payload.slice(sep + 1);
  } catch {
    return null;
  }
}
