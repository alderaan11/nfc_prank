import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, optionsResponse } from "@/lib/cors";
import { encryptMediaToken } from "@/lib/media-token";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const MEDIA_PREFIX = "prank-media/";
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi"]);

// Force dynamic — jamais de cache Next.js sur cet endpoint
export const dynamic = "force-dynamic";

// Cache en mémoire de la liste Blob (1 min) — évite un appel listing API à chaque requête
let blobListCache: { blobs: BlobEntry[]; ts: number } | null = null;
const LIST_CACHE_TTL = 60_000;

interface BlobEntry {
  url: string;
  pathname: string;
}

async function getBlobs(): Promise<BlobEntry[]> {
  const now = Date.now();
  if (blobListCache && now - blobListCache.ts < LIST_CACHE_TTL) {
    return blobListCache.blobs;
  }
  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${MEDIA_PREFIX}&limit=1000`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Blob list failed: ${res.status}`);
  const { blobs } = await res.json();
  blobListCache = { blobs: blobs ?? [], ts: now };
  return blobs ?? [];
}

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  let blobs: BlobEntry[];
  try {
    blobs = await getBlobs();
  } catch (e) {
    console.error("[media] list error:", e);
    return NextResponse.json(
      { error: "Could not list media" },
      { status: 502, headers: corsHeaders(origin) }
    );
  }

  if (blobs.length === 0) {
    return NextResponse.json(
      { error: "No media available" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  const idx = Math.floor(Math.random() * blobs.length);
  const blob = blobs[idx];

  const ext = blob.pathname.split(".").pop()?.toLowerCase() ?? "";
  const type = VIDEO_EXTS.has(ext) ? "video" : "image";
  const name = blob.pathname
    .replace(MEDIA_PREFIX, "")
    .replace(/-[A-Za-z0-9]+(\.[^.]+)$/, "$1");

  // Token chiffré AES-256 — l'URL Blob réelle n'est jamais exposée au navigateur
  const token = encryptMediaToken(blob.url);
  const serveUrl = `${req.nextUrl.origin}/api/media/serve?t=${token}`;

  const headers = { ...corsHeaders(origin), "cache-control": "no-store" };
  return NextResponse.json({ type, url: serveUrl, name }, { headers });
}
