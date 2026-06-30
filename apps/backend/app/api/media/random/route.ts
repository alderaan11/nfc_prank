import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, optionsResponse } from "@/lib/cors";
import { encryptMediaToken } from "@/lib/media-token";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const MEDIA_PREFIX = "prank-media/";
const TARGET_NAME = "finalll"; // vidéo toujours servie

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  const res = await fetch(
    `https://blob.vercel-storage.com?prefix=${MEDIA_PREFIX}&limit=1000`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Could not list media" },
      { status: 502, headers: corsHeaders(origin) }
    );
  }

  const { blobs } = await res.json();

  const blob = (blobs ?? []).find((b: { pathname: string }) =>
    b.pathname.includes(TARGET_NAME)
  );

  if (!blob) {
    return NextResponse.json(
      { error: "Video not found" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  const token = encryptMediaToken(blob.url);
  const serveUrl = `${req.nextUrl.origin}/api/media/serve?t=${token}`;

  const headers = { ...corsHeaders(origin), "cache-control": "no-store" };
  return NextResponse.json({ type: "video", url: serveUrl, name: TARGET_NAME }, { headers });
}
