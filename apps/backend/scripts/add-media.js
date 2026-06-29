#!/usr/bin/env node
// Usage: node scripts/add-media.js <chemin-fichier> [nom-optionnel]
// Exemple: node scripts/add-media.js ~/Downloads/mon-meme.jpg
// Upload direct vers Vercel Blob — rien dans git, disponible immédiatement.

const fs = require("fs");
const path = require("path");
const https = require("https");

// Charge .env.local pour récupérer BLOB_READ_WRITE_TOKEN en local
function loadEnvLocal() {
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnvLocal();

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN manquant. Lance `vercel env pull .env.local` dans apps/backend.");
  process.exit(1);
}

const [, , filePath, customName] = process.argv;
if (!filePath) {
  console.error("Usage: node scripts/add-media.js <chemin-fichier> [nom]");
  process.exit(1);
}

const resolvedPath = filePath.startsWith("~")
  ? path.join(process.env.HOME, filePath.slice(1))
  : path.resolve(filePath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Fichier introuvable: ${resolvedPath}`);
  process.exit(1);
}

const ext = path.extname(resolvedPath).toLowerCase();
const videoExts = [".mp4", ".webm", ".mov", ".avi"];
const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
const mimeMap = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".mov": "video/quicktime", ".avi": "video/x-msvideo",
};

if (!videoExts.includes(ext) && !imageExts.includes(ext)) {
  console.error(`Extension non supportée: ${ext}`);
  process.exit(1);
}

const filename = path.basename(resolvedPath);
const contentType = mimeMap[ext] || "application/octet-stream";
const blobPathname = `prank-media/${filename}`;

console.log(`Uploading ${filename} → Vercel Blob...`);

const fileBuffer = fs.readFileSync(resolvedPath);
const url = new URL(`https://blob.vercel-storage.com/${blobPathname}`);

const options = {
  method: "PUT",
  hostname: url.hostname,
  path: url.pathname,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "x-api-version": "7",
    "x-vercel-blob-access": "private",
    "content-type": contentType,
    "content-length": fileBuffer.length,
  },
};

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    if (res.statusCode !== 200) {
      console.error(`Upload échoué (${res.statusCode}):`, body);
      process.exit(1);
    }
    const data = JSON.parse(body);
    console.log(`✓ Uploadé: ${filename}`);
    console.log(`  URL Blob: ${data.url}`);
    console.log(`\n✓ Disponible immédiatement sur https://nfc-hihi-fun.vercel.app/r`);
  });
});

req.on("error", (e) => {
  console.error("Erreur réseau:", e.message);
  process.exit(1);
});

req.write(fileBuffer);
req.end();
