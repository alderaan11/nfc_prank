#!/usr/bin/env node
// Test d'intégration Vercel Blob — même logique que poll-store.ts
// Usage: node scripts/test-blob.js

const fs = require("fs");
const path = require("path");

// Charger .env.local
const envPath = path.join(__dirname, "../.env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0) {
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^"|"$/g, "");
    process.env[key] = val;
  }
}

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN manquant dans .env.local");
  process.exit(1);
}

const TEST_PATH = "poll-votes-test.json";

let passed = 0;
let failed = 0;

function ok(name) {
  console.log(`  ✓ ${name}`);
  passed++;
}

function fail(name, detail) {
  console.error(`  ✗ ${name}: ${detail}`);
  failed++;
}

async function deleteAll() {
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${TEST_PATH}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  const { blobs } = await res.json();
  if (!blobs?.length) return;
  await fetch("https://blob.vercel-storage.com", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ urls: blobs.map((b) => b.url) }),
  });
}

async function writeVotes(votes) {
  await deleteAll();
  const res = await fetch(`https://blob.vercel-storage.com/${TEST_PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "x-api-version": "7",
      "x-vercel-blob-access": "private",
      "content-type": "application/json",
    },
    body: JSON.stringify(votes),
  });
  if (!res.ok) throw new Error(`PUT ${res.status}: ${await res.text()}`);
  return res;
}

async function readVotes() {
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${TEST_PATH}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  if (!res.ok) throw new Error(`LIST ${res.status}`);
  const { blobs } = await res.json();
  if (!blobs || blobs.length === 0) return [];

  const latest = blobs.sort(
    (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
  )[0];

  const dl = await fetch(latest.url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!dl.ok) throw new Error(`DOWNLOAD ${dl.status} — ${latest.url}`);
  return dl.json();
}

async function cleanup() {
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${TEST_PATH}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  const { blobs } = await res.json();
  if (blobs?.length > 0) {
    await fetch("https://blob.vercel-storage.com", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ urls: blobs.map((b) => b.url) }),
    });
  }
}

async function main() {
  console.log("Integration tests — Vercel Blob\n");

  // 1. Écriture initiale
  console.log("1. Écriture");
  const votes1 = [{ choices: ["Skyjo", "Trio", "Time Bomb"] }];
  try {
    const res = await writeVotes(votes1);
    res.status === 200 ? ok("PUT retourne 200") : fail("PUT", `status=${res.status}`);
  } catch (e) {
    fail("PUT", e.message);
  }

  // 2. Lecture après écriture
  console.log("\n2. Lecture");
  try {
    const read = await readVotes();
    Array.isArray(read)
      ? ok("readVotes retourne un tableau")
      : fail("readVotes", "pas un tableau");

    read.length === 1
      ? ok(`readVotes contient ${read.length} vote`)
      : fail("readVotes", `attendu 1 vote, reçu ${read.length}`);

    JSON.stringify(read[0]) === JSON.stringify(votes1[0])
      ? ok("contenu du vote correct")
      : fail("contenu", `attendu ${JSON.stringify(votes1[0])}, reçu ${JSON.stringify(read[0])}`);
  } catch (e) {
    fail("readVotes", e.message);
  }

  // 3. Ajout d'un deuxième vote (overwrite avec 2 votes)
  console.log("\n3. Ajout d'un deuxième vote");
  try {
    const current = await readVotes();
    const votes2 = [
      ...current,
      { choices: ["Le Loup Garou", "Skyjo", "King of Tokyo"] },
    ];
    await writeVotes(votes2);
    const read = await readVotes();
    read.length === 2
      ? ok(`readVotes contient ${read.length} votes après overwrite`)
      : fail("overwrite", `attendu 2 votes, reçu ${read.length}`);
  } catch (e) {
    fail("overwrite", e.message);
  }

  // 4. Calcul du scoring
  console.log("\n4. Scoring Borda");
  try {
    const votes = await readVotes();
    const scores = {};
    for (const v of votes) {
      scores[v.choices[0]] = (scores[v.choices[0]] ?? 0) + 3;
      scores[v.choices[1]] = (scores[v.choices[1]] ?? 0) + 2;
      scores[v.choices[2]] = (scores[v.choices[2]] ?? 0) + 1;
    }
    scores["Skyjo"] === 5
      ? ok(`Skyjo = ${scores["Skyjo"]} pts (3+2 attendu)`)
      : fail("scoring Skyjo", `attendu 5, reçu ${scores["Skyjo"]}`);
    scores["Trio"] === 2
      ? ok(`Trio = ${scores["Trio"]} pts`)
      : fail("scoring Trio", `attendu 2, reçu ${scores["Trio"]}`);
  } catch (e) {
    fail("scoring", e.message);
  }

  // Nettoyage
  console.log("\n5. Nettoyage...");
  await cleanup();
  ok("blobs de test supprimés");

  // Résultat
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Erreur inattendue:", e);
  process.exit(1);
});
