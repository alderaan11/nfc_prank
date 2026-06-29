import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, optionsResponse } from "@/lib/cors";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const MEDIA_PREFIX = "prank-media/";
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi"]);

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

// Force dynamic — jamais de cache Next.js sur cet endpoint
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${MEDIA_PREFIX}&limit=1000`,
    {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error("[media] list failed:", res.status, await res.text());
    return NextResponse.json(
      { error: "Could not list media" },
      { status: 502, headers: corsHeaders(origin) }
    );
  }

  const { blobs } = await res.json();

  if (!blobs || blobs.length === 0) {
    return NextResponse.json(
      { error: "No media available" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  const idx = Math.floor(Math.random() * blobs.length);
  const blob = blobs[idx];

  const ext = blob.pathname.split(".").pop()?.toLowerCase() ?? "";
  const type = VIDEO_EXTS.has(ext) ? "video" : "image";
  const name = blob.pathname.replace(MEDIA_PREFIX, "").replace(/-[A-Za-z0-9]+(\.[^.]+)$/, "$1");

  // Proxy via /api/media/serve — le Bearer token ne sort jamais côté client
  const serveUrl = `${req.nextUrl.origin}/api/media/serve?url=${encodeURIComponent(blob.url)}`;

  const headers = { ...corsHeaders(origin), "cache-control": "no-store" };
  return NextResponse.json({ type, url: serveUrl, name }, { headers });
}
