#!/usr/bin/env node
// Usage: node scripts/add-video.js "Titre de ma vidéo" "/videos/fichier.mp4"
// Utilise des IDs numériques (1 à 11) pour les 11 puces NFC

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const [, , title, url] = process.argv;

if (!title || !url) {
  console.error('Usage: node scripts/add-video.js "Titre" "/videos/fichier.mp4"');
  process.exit(1);
}

const jsonPath = path.join(__dirname, "../data/videos.json");
const store = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const usedNumbers = Object.keys(store).map(k => parseInt(k)).filter(n => n >= 1 && n <= 11);
const next = Array.from({ length: 11 }, (_, i) => i + 1).find(n => !usedNumbers.includes(n));

if (!next) {
  console.error("Toutes les 11 puces NFC sont déjà assignées.");
  process.exit(1);
}

const suffix = crypto.randomBytes(4).toString("hex");
const id = `${next}-${suffix}`;

store[id] = { title, url };
fs.writeFileSync(jsonPath, JSON.stringify(store, null, 2));
console.log(`Vidéo ajoutée !`);
console.log(`  ID  : ${id}`);
console.log(`  URL NFC : https://nfc-hihi-fun.vercel.app/v/${id}`);
console.log(`\nRedeploie le backend pour que le changement soit pris en compte.`);
