import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, optionsResponse } from "@/lib/cors";
import mediaData from "@/data/media.json";

interface MediaEntry {
  type: "image" | "video";
  path: string;
  name: string;
}

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const media = mediaData as MediaEntry[];

  if (!media || media.length === 0) {
    return NextResponse.json(
      { error: "No media available" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  const idx = Math.floor(Math.random() * media.length);
  const entry = media[idx];
  const url = `${req.nextUrl.origin}${entry.path}`;

  return NextResponse.json(
    { type: entry.type, url, name: entry.name },
    { headers: corsHeaders(origin) }
  );
}
