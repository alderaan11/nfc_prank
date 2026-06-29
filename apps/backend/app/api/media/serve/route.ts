import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, optionsResponse } from "@/lib/cors";
import { decryptMediaToken } from "@/lib/media-token";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const BLOB_HOST = ".blob.vercel-storage.com";

export async function OPTIONS(req: NextRequest) {
  return optionsResponse(req.headers.get("origin"));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const encryptedToken = req.nextUrl.searchParams.get("t");

  if (!encryptedToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const blobUrl = decryptMediaToken(encryptedToken);

  if (!blobUrl || !blobUrl.includes(BLOB_HOST)) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 403 }
    );
  }

  const upstream = await fetch(blobUrl, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(req.headers.get("range")
        ? { range: req.headers.get("range")! }
        : {}),
    },
  });

  const h = new Headers(corsHeaders(origin));
  h.set(
    "content-type",
    upstream.headers.get("content-type") ?? "application/octet-stream"
  );
  h.set("cache-control", "no-store");
  h.set("accept-ranges", "bytes");

  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  if (contentLength) h.set("content-length", contentLength);
  if (contentRange) h.set("content-range", contentRange);

  return new NextResponse(upstream.body, { status: upstream.status, headers: h });
}
