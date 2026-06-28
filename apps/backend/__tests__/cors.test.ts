describe("corsHeaders", () => {
  const FRONTEND = "https://nfc-hihi-fun.vercel.app";

  beforeAll(() => {
    process.env.FRONTEND_URL = FRONTEND;
  });

  it("allows the configured frontend origin", async () => {
    // Import after setting env var (module-level const reads env at import time)
    const { corsHeaders } = await import("../lib/cors");
    const headers = corsHeaders(FRONTEND) as Record<string, string>;
    expect(headers["Access-Control-Allow-Origin"]).toBe(FRONTEND);
  });

  it("does not reflect unknown origins", async () => {
    const { corsHeaders } = await import("../lib/cors");
    const headers = corsHeaders("https://evil.com") as Record<string, string>;
    expect(headers["Access-Control-Allow-Origin"]).not.toBe("https://evil.com");
  });

  it("handles null origin gracefully", async () => {
    const { corsHeaders } = await import("../lib/cors");
    expect(() => corsHeaders(null)).not.toThrow();
  });
});
