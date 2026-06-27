import { put, del, head } from "@vercel/blob";

const VIDEO_PREFIX = "videos/";

export async function uploadVideo(
  filename: string,
  body: ReadableStream | Buffer,
  contentType: string
) {
  const key = `${VIDEO_PREFIX}${Date.now()}-${filename}`;
  const blob = await put(key, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  return { key, url: blob.url };
}

export async function deleteVideo(key: string) {
  await del(key);
}

export async function getVideoUrl(key: string): Promise<string | null> {
  try {
    const blob = await head(key);
    return blob.url;
  } catch {
    return null;
  }
}
