import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadVideo } from "@/lib/blob";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { validateMp4Magic, validateFileSize, MAX_SIZE_BYTES_EXPORT } from "@/lib/validate-file";
import { corsHeaders, optionsResponse } from "@/lib/cors";
import { z } from "zod";

const titleSchema = z
  .string()
  .min(1, "Title required")
  .max(120, "Title too long")
  .trim();

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  const throttle = await rateLimit(req, "upload");
  if (throttle) return throttle;

  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  const titleRaw = formData.get("title");
  const file = formData.get("file");

  const titleResult = titleSchema.safeParse(titleRaw);
  if (!titleResult.success) {
    return NextResponse.json(
      { error: titleResult.error.errors[0].message },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  if (!validateFileSize(file.size)) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_SIZE_BYTES_EXPORT / 1024 / 1024} MB` },
      { status: 413, headers: corsHeaders(origin) }
    );
  }

  // Validate magic bytes (read first 12 bytes)
  const headerBuffer = Buffer.from(await file.slice(0, 12).arrayBuffer());
  if (!validateMp4Magic(headerBuffer)) {
    return NextResponse.json(
      { error: "Only MP4 files are accepted" },
      { status: 415, headers: corsHeaders(origin) }
    );
  }

  const safeFilename = file.name.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();

  const { key } = await uploadVideo(
    safeFilename,
    Buffer.from(await file.arrayBuffer()),
    "video/mp4"
  );

  const video = await db.video.create({
    data: {
      title: titleResult.data,
      filename: file.name,
      blobKey: key,
      size: file.size,
      mimeType: "video/mp4",
    },
  });

  return NextResponse.json(
    { id: video.id, title: video.title },
    { status: 201, headers: corsHeaders(origin) }
  );
}
