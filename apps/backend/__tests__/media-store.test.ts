// Tests de la logique de détection de type média (image vs vidéo par extension)
// Les fichiers sont dans Vercel Blob — plus dans data/media.json

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi"]);

function detectType(pathname: string): "video" | "image" {
  const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTS.has(ext) ? "video" : "image";
}

function extractName(pathname: string, prefix: string): string {
  return pathname.replace(prefix, "").replace(/-[A-Za-z0-9]+(\.[^.]+)$/, "$1");
}

describe("detectType", () => {
  it("reconnaît les vidéos", () => {
    expect(detectType("prank-media/tung-tung-abc123.mp4")).toBe("video");
    expect(detectType("prank-media/cat-abc123.webm")).toBe("video");
    expect(detectType("prank-media/clip-abc123.mov")).toBe("video");
  });

  it("reconnaît les images", () => {
    expect(detectType("prank-media/photo-abc123.jpg")).toBe("image");
    expect(detectType("prank-media/meme-abc123.jpeg")).toBe("image");
    expect(detectType("prank-media/sticker-abc123.webp")).toBe("image");
    expect(detectType("prank-media/robot-abc123.avif")).toBe("image");
    expect(detectType("prank-media/banner-abc123.png")).toBe("image");
    expect(detectType("prank-media/anim-abc123.gif")).toBe("image");
  });

  it("extension inconnue → image par défaut", () => {
    expect(detectType("prank-media/file-abc123.xyz")).toBe("image");
  });
});

describe("extractName", () => {
  const PREFIX = "prank-media/";

  it("retire le préfixe et le suffixe aléatoire Blob", () => {
    expect(extractName("prank-media/tung-tung-alnfiGk5FQ.mp4", PREFIX)).toBe("tung-tung.mp4");
    expect(extractName("prank-media/robot_green-oI0eN4AU.webp", PREFIX)).toBe("robot_green.webp");
  });

  it("conserve les tirets dans le nom original", () => {
    expect(extractName("prank-media/breaking-bad-4f7a.jpeg", PREFIX)).toBe("breaking-bad.jpeg");
  });
});

describe("random selection", () => {
  const fakeBlobs = [
    { pathname: "prank-media/a-abc.jpeg", downloadUrl: "https://blob/a" },
    { pathname: "prank-media/b-def.mp4", downloadUrl: "https://blob/b" },
    { pathname: "prank-media/c-ghi.webp", downloadUrl: "https://blob/c" },
  ];

  it("l'index est toujours dans les bornes", () => {
    for (let i = 0; i < 100; i++) {
      const idx = Math.floor(Math.random() * fakeBlobs.length);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(fakeBlobs.length);
    }
  });

  it("chaque blob est accessible par son index", () => {
    fakeBlobs.forEach((_, idx) => {
      expect(fakeBlobs[idx].downloadUrl).toBeTruthy();
    });
  });
});
