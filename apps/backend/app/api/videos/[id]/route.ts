import { NextRequest, NextResponse } from "next/server";
import { getVideo } from "@/lib/videos-store";
import { corsHeaders, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get("origin");
  const { id } = await params;

  const video = getVideo(id);

  if (!video) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  return NextResponse.json(
    { id, title: video.title, url: video.url },
    { headers: corsHeaders(origin) }
  );
}
