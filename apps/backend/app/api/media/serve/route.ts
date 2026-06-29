import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, optionsResponse } from "@/lib/cors";
import { decryptMediaToken } from "@/lib/media-token";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? "";
const BLOB_HOST = ".blob.vercel-storage.com";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

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

  // Validation stricte du hostname — protège contre le SSRF
  let parsed: URL;
  try {
    parsed = new URL(blobUrl ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }
  if (!parsed.hostname.endsWith(BLOB_HOST)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const upstream = await fetch(blobUrl!, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(req.headers.get("range") ? { range: req.headers.get("range")! } : {}),
    },
  });

  // Refuse les fichiers trop volumineux pour éviter un DoS par proxy
  const contentLength = upstream.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const h = new Headers(corsHeaders(origin));
  h.set("content-type", upstream.headers.get("content-type") ?? "application/octet-stream");
  h.set("cache-control", "no-store");
  h.set("accept-ranges", "bytes");
  if (contentLength) h.set("content-length", contentLength);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) h.set("content-range", contentRange);

  return new NextResponse(upstream.body, { status: upstream.status, headers: h });
}
