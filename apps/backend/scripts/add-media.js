#!/usr/bin/env node
// Usage: node scripts/add-media.js <chemin-fichier> [nom-optionnel]
// Exemple: node scripts/add-media.js ~/Downloads/mon-meme.jpg "Mon meme"
// Tous les médias (images ET vidéos) vont dans public/media/

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

const type = videoExts.includes(ext)
  ? "video"
  : imageExts.includes(ext)
  ? "image"
  : null;

if (!type) {
  console.error(`Extension non supportée: ${ext}`);
  console.error(`Images: ${imageExts.join(", ")}`);
  console.error(`Vidéos: ${videoExts.join(", ")}`);
  process.exit(1);
}

const filename = path.basename(resolvedPath);
const name = customName || path.basename(resolvedPath, ext);

// Tout va dans public/media/ — pas de séparation images/vidéos
const destDir = path.join(__dirname, "../public/media");
fs.mkdirSync(destDir, { recursive: true });

const destPath = path.join(destDir, filename);
fs.copyFileSync(resolvedPath, destPath);

const urlPath = `/media/${filename}`;

const jsonPath = path.join(__dirname, "../data/media.json");
const media = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

if (media.find((m) => m.path === urlPath)) {
  console.log(`⚠  ${filename} est déjà dans l'index — mise à jour ignorée.`);
} else {
  media.push({ type, path: urlPath, name });
  fs.writeFileSync(jsonPath, JSON.stringify(media, null, 2) + "\n");
  console.log(`✓ Ajouté dans l'index: ${filename} (${type})`);
}

const repoRoot = path.join(__dirname, "../../..");

try {
  execSync(
    `git -C "${repoRoot}" add apps/backend/public/media apps/backend/data/media.json`,
    { stdio: "inherit" }
  );
  execSync(
    `git -C "${repoRoot}" commit -m "media: add ${filename}"`,
    { stdio: "inherit" }
  );
  execSync(`git -C "${repoRoot}" push`, { stdio: "inherit" });
  console.log(
    "\n✓ Pushé → Vercel va redéployer, le média sera disponible dans ~1 min."
  );
} catch {
  console.log(
    "\n⚠  Fichier copié et index mis à jour, mais git push a échoué."
  );
  console.log('   Lance "git add . && git commit -m media && git push" manuellement.');
}
