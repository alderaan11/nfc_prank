import { getResults, getVoteCount } from "../lib/poll-store";

const GAMES = ["Game A", "Game B", "Game C"];

function mockFetchEmpty() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ blobs: [] }),
  }) as jest.Mock;
}

function mockFetchWithVotes(votes: object[]) {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blobs: [{ downloadUrl: "https://example.com/v.json" }] }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => votes,
    }) as jest.Mock;
}

describe("getResults", () => {
  it("returns all games with 0 points when no votes", async () => {
    mockFetchEmpty();
    const results = await getResults(GAMES);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.points === 0)).toBe(true);
  });

  it("scores 1st=3pts, 2nd=2pts, 3rd=1pt", async () => {
    mockFetchWithVotes([{ choices: ["Game A", "Game B", "Game C"] }]);
    const results = await getResults(GAMES);
    expect(results.find((r) => r.game === "Game A")?.points).toBe(3);
    expect(results.find((r) => r.game === "Game B")?.points).toBe(2);
    expect(results.find((r) => r.game === "Game C")?.points).toBe(1);
  });

  it("sorts results by points descending", async () => {
    mockFetchWithVotes([
      { choices: ["Game B", "Game A", "Game C"] },
      { choices: ["Game B", "Game C", "Game A"] },
    ]);
    const results = await getResults(GAMES);
    expect(results[0].game).toBe("Game B");
    expect(results[0].points).toBe(6);
  });

  it("ignores votes for unknown games", async () => {
    mockFetchWithVotes([{ choices: ["Unknown", "Game A", "Game B"] }]);
    const results = await getResults(GAMES);
    expect(results.find((r) => r.game === "Game A")?.points).toBe(2);
    expect(results.find((r) => r.game === "Game B")?.points).toBe(1);
  });
});

describe("getVoteCount", () => {
  it("returns 0 when no votes", async () => {
    mockFetchEmpty();
    expect(await getVoteCount()).toBe(0);
  });

  it("returns correct count", async () => {
    mockFetchWithVotes([
      { choices: ["Game A", "Game B", "Game C"] },
      { choices: ["Game B", "Game A", "Game C"] },
    ]);
    expect(await getVoteCount()).toBe(2);
  });
});
