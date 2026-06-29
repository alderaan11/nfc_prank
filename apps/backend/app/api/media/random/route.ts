import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, optionsResponse } from "@/lib/cors";
import { encryptMediaToken } from "@/lib/media-token";
import { readCounter, writeCounter } from "@/lib/media-counter";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const MEDIA_PREFIX = "prank-media/";
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi"]);

export const dynamic = "force-dynamic";

let blobListCache: { blobs: BlobEntry[]; ts: number } | null = null;
const LIST_CACHE_TTL = 60_000;

interface BlobEntry {
  url: string;
  pathname: string;
  uploadedAt: string;
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
  const sorted = (blobs ?? []).sort(
    (a: BlobEntry, b: BlobEntry) =>
      new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  );
  blobListCache = { blobs: sorted, ts: now };
  return sorted;
}

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Lecture liste + compteur en parallèle — une seule requête Blob chacun
  let blobs: BlobEntry[];
  let currentIndex: number;
  try {
    [blobs, currentIndex] = await Promise.all([getBlobs(), readCounter()]);
  } catch (e) {
    console.error("[media] init error:", e);
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

  const safeIndex = currentIndex % blobs.length;
  const nextIndex = (safeIndex + 1) % blobs.length;

  // Écriture du nouveau compteur APRÈS l'envoi de la réponse — ne bloque pas
  after(() => writeCounter(nextIndex).catch(console.error));

  const blob = blobs[safeIndex];
  const ext = blob.pathname.split(".").pop()?.toLowerCase() ?? "";
  const type = VIDEO_EXTS.has(ext) ? "video" : "image";
  const name = blob.pathname
    .replace(MEDIA_PREFIX, "")
    .replace(/-[A-Za-z0-9]+(\.[^.]+)$/, "$1");

  const token = encryptMediaToken(blob.url);
  const serveUrl = `${req.nextUrl.origin}/api/media/serve?t=${token}`;

  const headers = { ...corsHeaders(origin), "cache-control": "no-store" };
  return NextResponse.json({ type, url: serveUrl, name }, { headers });
}
