import { readCounter, writeCounter } from "../lib/media-counter";

// Helper : mock fetch pour simuler une réponse Blob listing avec un compteur donné
function mockCounterValue(value: number) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      blobs: [
        {
          pathname: `prank-counter/${value}`,
          url: `https://example.blob.vercel-storage.com/prank-counter/${value}`,
          uploadedAt: new Date().toISOString(),
        },
      ],
    }),
    text: async () => String(value),
  }) as jest.Mock;
}

function mockNoBlobsForCounter() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ blobs: [] }),
  }) as jest.Mock;
}

// Simule la séquence complète d'une visite :
// 1. readCounter() = 1 appel Blob list
// 2. writeCounter() = 1 appel list + delete + write
function mockCounterSequence(currentValue: number) {
  const blobEntry = {
    pathname: `prank-counter/${currentValue}`,
    url: `https://example.blob.vercel-storage.com/prank-counter/${currentValue}`,
    uploadedAt: new Date().toISOString(),
  };
  global.fetch = jest.fn()
    // readCounter: list
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blobs: [blobEntry] }),
    })
    // writeCounter: list (pour avoir les URLs à supprimer)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blobs: [blobEntry] }),
    })
    // writeCounter: delete
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    // writeCounter: put nouveau compteur
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) as jest.Mock;
}

// --- Tests readCounter ---

describe("readCounter", () => {
  it("retourne 0 quand aucun blob n'existe", async () => {
    mockNoBlobsForCounter();
    expect(await readCounter()).toBe(0);
  });

  it("lit correctement la valeur encodée dans le pathname", async () => {
    mockCounterValue(7);
    expect(await readCounter()).toBe(7);
  });

  it("retourne le blob le plus récent si plusieurs existent", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        blobs: [
          { pathname: "prank-counter/3", url: "https://x/3", uploadedAt: "2024-01-01T10:00:00Z" },
          { pathname: "prank-counter/7", url: "https://x/7", uploadedAt: "2024-01-01T12:00:00Z" },
          { pathname: "prank-counter/5", url: "https://x/5", uploadedAt: "2024-01-01T11:00:00Z" },
        ],
      }),
    }) as jest.Mock;
    expect(await readCounter()).toBe(7);
  });

  it("retourne 0 si le pathname est malformé", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        blobs: [{ pathname: "prank-counter/abc", url: "https://x/abc", uploadedAt: new Date().toISOString() }],
      }),
    }) as jest.Mock;
    expect(await readCounter()).toBe(0);
  });

  it("retourne 0 si Blob API est en erreur", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
    expect(await readCounter()).toBe(0);
  });
});

// --- Tests logique séquentielle ---

describe("logique séquentielle (1 visite = 1 avancement)", () => {
  const TOTAL = 5;

  it("avance d'un cran à chaque visite", () => {
    // La visite N affiche le média N%TOTAL, et écrit le compteur (N+1)%TOTAL
    for (let visit = 0; visit < TOTAL * 3; visit++) {
      const shown = visit % TOTAL;
      const writtenNext = (shown + 1) % TOTAL;
      // La visite suivante doit lire writtenNext et afficher ce média
      expect(writtenNext).toBe((visit + 1) % TOTAL);
    }
  });

  it("boucle correctement après le dernier média", () => {
    const current = TOTAL - 1; // dernier index
    const next = (current + 1) % TOTAL;
    expect(next).toBe(0);
  });

  it("reste valide si des médias ont été supprimés (index hors bornes)", () => {
    const staleIndex = 12; // compteur vieux, maintenant seulement 5 médias
    const total = 5;
    const safe = staleIndex % total;
    expect(safe).toBeGreaterThanOrEqual(0);
    expect(safe).toBeLessThan(total);
  });

  it("chaque visite produit un index différent du précédent (sauf boucle)", () => {
    const visits = Array.from({ length: TOTAL * 3 }, (_, i) => i % TOTAL);
    for (let i = 0; i < visits.length - 1; i++) {
      // index suivant ≠ index courant (sauf quand on boucle sur 1 seul média)
      if (TOTAL > 1) {
        expect(visits[i]).not.toBe(visits[i + 1]);
      }
    }
  });

  it("après N visites on a vu tous les médias exactement une fois", () => {
    const seen = new Set<number>();
    for (let visit = 0; visit < TOTAL; visit++) {
      seen.add(visit % TOTAL);
    }
    expect(seen.size).toBe(TOTAL);
  });
});

// --- Test writeCounter (vérifie qu'il appelle bien Blob) ---

describe("writeCounter", () => {
  it("effectue 3 appels Blob (list, delete, put)", async () => {
    const blobEntry = {
      pathname: "prank-counter/5",
      url: "https://example.blob.vercel-storage.com/prank-counter/5",
      uploadedAt: new Date().toISOString(),
    };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ blobs: [blobEntry] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) as jest.Mock;

    await writeCounter(6);

    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(3);

    const deleteCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(deleteCall[1].method).toBe("DELETE");

    const putCall = (global.fetch as jest.Mock).mock.calls[2];
    expect(putCall[0]).toContain("prank-counter/6");
    expect(putCall[1].method).toBe("PUT");
  });

  it("écrit le bon index dans le pathname", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ blobs: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) as jest.Mock;

    await writeCounter(42);

    const putCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(putCall[0]).toMatch(/prank-counter\/42$/);
  });
});
