import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteVideo, getVideoUrl } from "@/lib/blob";
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

  const video = await db.video.findUnique({
    where: { id },
    select: { id: true, title: true, filename: true, blobKey: true, size: true, createdAt: true },
  });

  if (!video) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  const url = await getVideoUrl(video.blobKey);
  if (!url) {
    return NextResponse.json(
      { error: "Video file unavailable" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  return NextResponse.json(
    { id: video.id, title: video.title, filename: video.filename, size: video.size, url, createdAt: video.createdAt },
    { headers: corsHeaders(origin) }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get("origin");

  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  const { id } = await params;

  const video = await db.video.findUnique({ where: { id } });
  if (!video) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: corsHeaders(origin) }
    );
  }

  await deleteVideo(video.blobKey);
  await db.video.delete({ where: { id } });

  return NextResponse.json({ success: true }, { headers: corsHeaders(origin) });
}
