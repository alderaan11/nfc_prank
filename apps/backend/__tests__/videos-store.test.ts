import { getVideo, listVideos } from "../lib/videos-store";

describe("listVideos", () => {
  it("returns an array", () => {
    expect(Array.isArray(listVideos())).toBe(true);
  });

  it("each entry has id, title, url", () => {
    listVideos().forEach((v) => {
      expect(typeof v.id).toBe("string");
      expect(typeof v.title).toBe("string");
      expect(typeof v.url).toBe("string");
    });
  });
});

describe("getVideo", () => {
  it("returns null for unknown id", () => {
    expect(getVideo("does-not-exist")).toBeNull();
  });

  it("returns entry for a known id", () => {
    const videos = listVideos();
    if (videos.length === 0) return;
    const { id, title, url } = videos[0];
    const result = getVideo(id);
    expect(result).not.toBeNull();
    expect(result?.title).toBe(title);
    expect(result?.url).toBe(url);
  });
});
