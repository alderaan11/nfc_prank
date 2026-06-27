#!/usr/bin/env node
// Usage: node scripts/add-video.js "Titre de ma vidéo" "https://url-vercel-blob.mp4"
// Génère un ID aléatoire et l'ajoute dans data/videos.json

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const [, , title, url] = process.argv;

if (!title || !url) {
  console.error("Usage: node scripts/add-video.js \"Titre\" \"https://url.mp4\"");
  process.exit(1);
}

const jsonPath = path.join(__dirname, "../data/videos.json");
const store = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const id = crypto.randomBytes(5).toString("hex"); // ex: a3f9c2
store[id] = { title, url };

fs.writeFileSync(jsonPath, JSON.stringify(store, null, 2));
console.log(`Vidéo ajoutée !`);
console.log(`  ID  : ${id}`);
console.log(`  URL NFC : https://TON-FRONTEND.vercel.app/v/${id}`);
console.log(`\nRedeploie le backend pour que le changement soit pris en compte.`);
