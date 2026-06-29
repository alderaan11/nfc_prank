import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const KEY = createHash("sha256")
  .update(process.env.BLOB_READ_WRITE_TOKEN ?? "dev-fallback-key")
  .digest();

const TTL_MS = 5 * 60 * 1000;

export function encryptMediaToken(blobUrl: string): string {
  const payload = `${Date.now()}|${blobUrl}`;
  const iv = randomBytes(12); // GCM recommande 12 octets
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 octets d'auth tag
  // Format: IV (12) | tag (16) | ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptMediaToken(token: string): string | null {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 29) return null; // 12 + 16 + au moins 1 octet
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    // GCM: si le ciphertext est altéré, setAuthTag lève une exception ici
    const payload = decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
    const sep = payload.indexOf("|");
    if (sep === -1) return null;
    const ts = parseInt(payload.slice(0, sep), 10);
    if (isNaN(ts) || Date.now() - ts > TTL_MS) return null;
    return payload.slice(sep + 1);
  } catch {
    return null;
  }
}
