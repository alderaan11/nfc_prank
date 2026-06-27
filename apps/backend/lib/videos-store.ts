import videosData from "../data/videos.json";

export interface VideoEntry {
  title: string;
  url: string;
}

type VideosStore = Record<string, VideoEntry>;

export function getVideo(id: string): VideoEntry | null {
  const store = videosData as VideosStore;
  return store[id] ?? null;
}

export function listVideos(): Array<{ id: string } & VideoEntry> {
  const store = videosData as VideosStore;
  return Object.entries(store).map(([id, entry]) => ({ id, ...entry }));
}
