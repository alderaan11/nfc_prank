import mediaData from "../data/media.json";

interface MediaEntry {
  type: "image" | "video";
  path: string;
  name: string;
}

const media = mediaData as MediaEntry[];

describe("media.json index", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(media)).toBe(true);
    expect(media.length).toBeGreaterThan(0);
  });

  it("every entry has type, path, name", () => {
    media.forEach((entry) => {
      expect(["image", "video"]).toContain(entry.type);
      expect(typeof entry.path).toBe("string");
      expect(entry.path.startsWith("/")).toBe(true);
      expect(typeof entry.name).toBe("string");
    });
  });

  it("all paths start with /media/", () => {
    media.forEach((entry) => {
      expect(entry.path).toMatch(/^\/media\//);
    });
  });

  it("has at least one image", () => {
    expect(media.some((e) => e.type === "image")).toBe(true);
  });

  it("has at least one video", () => {
    expect(media.some((e) => e.type === "video")).toBe(true);
  });

  it("no duplicate paths", () => {
    const paths = media.map((e) => e.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });
});

describe("random selection logic", () => {
  it("picks an index within bounds", () => {
    for (let i = 0; i < 50; i++) {
      const idx = Math.floor(Math.random() * media.length);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(media.length);
    }
  });

  it("returns a valid entry for every possible index", () => {
    media.forEach((_, idx) => {
      const entry = media[idx];
      expect(entry).toBeDefined();
      expect(entry.path).toBeTruthy();
    });
  });
});
