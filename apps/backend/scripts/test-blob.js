#!/usr/bin/env node
// Usage: node scripts/test-blob.js
// Teste que le Blob store fonctionne correctement (lit le token depuis .env.local)

const fs = require("fs");
const path = require("path");

// Lire .env.local
const envPath = path.join(__dirname, "../.env.local");
const env = fs.readFileSync(envPath, "utf8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) {
    process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
}

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function main() {
  const TEST_PATH = "test-probe-delete-me.json";

  console.log("1. PUT test (x-vercel-blob-access: private)...");
  const putRes = await fetch(`https://blob.vercel-storage.com/${TEST_PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "x-api-version": "7",
      "x-vercel-blob-access": "private",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": "1",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ok: true }),
  });
  if (!putRes.ok) {
    console.error("   FAIL:", await putRes.text());
    process.exit(1);
  }
  console.log("   OK:", putRes.status);

  console.log("2. LIST test...");
  const listRes = await fetch(
    `https://blob.vercel-storage.com?prefix=${TEST_PATH}&limit=1`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  const { blobs } = await listRes.json();
  console.log("   OK: found", blobs.length, "blob(s)");

  console.log("3. Nettoyage...");
  if (blobs.length > 0) {
    const delRes = await fetch("https://blob.vercel-storage.com", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ urls: blobs.map((b) => b.url) }),
    });
    console.log("   OK:", delRes.status);
  }

  console.log("\nBlob store OK !");
}

main();
