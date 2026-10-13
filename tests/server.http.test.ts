import request from "supertest";
import { AuthorizationCode } from "simple-oauth2";
import { describe, expect, it, vi } from "vite-plus/test";
import { app, startHttpServer } from "../src/server.js";

describe("HTTP server", () => {
  it("reports the v2 protocol target", async () => {
    const response = await request(app).get("/health").set("Host", "localhost");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "healthy",
      service: "raindrop-mcp",
      protocolTarget: "2026-07-28",
      httpMode: "per-request",
    });
    const listen = vi.spyOn(app, "listen").mockReturnValue(app);
    try {
      startHttpServer();
      expect(listen).toHaveBeenCalledWith(
        expect.any(Number),
        "127.0.0.1",
        expect.any(Function),
      );
    } finally {
      listen.mockRestore();
    }
  });

  it("rejects cross-origin browser requests", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("Host", "localhost")
      .set("Origin", "https://evil.example")
      .send({ jsonrpc: "2.0", id: 1, method: "ping" });

    expect(response.status).toBe(403);
  });

  it("accepts same-origin preflight without wildcard CORS", async () => {
    const response = await request(app)
      .options("/mcp")
      .set("Host", "localhost")
      .set("Origin", "http://localhost:3002");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3002",
    );
  });

  it("binds OAuth state to the browser, expires it, and prevents replay", async () => {
    vi.stubEnv("RAINDROP_CLIENT_ID", "test-client");
    const exchange = vi
      .spyOn(AuthorizationCode.prototype, "getToken")
      .mockResolvedValue({
        token: { access_token: "test-access-token" },
      } as any);
    const begin = async () => {
      const response = await request(app)
        .get("/auth/raindrop")
        .set("Host", "localhost");
      expect(response.status).toBe(302);
      const state = new URL(response.headers.location!).searchParams.get(
        "state",
      )!;
      const cookie = response.headers["set-cookie"]![0]!;
      expect(cookie).toContain("HttpOnly; SameSite=Lax; Max-Age=600");
      return { state, cookie: cookie.split(";")[0]! };
    };
    try {
      const { state, cookie } = await begin();
      for (const [query, cookies] of [
        ["code=test", cookie],
        ["code=test&state=wrong", cookie],
        [`code=test&state=${state}`, "unrelated=cookie"],
      ]) {
        const response = await request(app)
          .get(`/auth/raindrop/callback?${query}`)
          .set("Host", "localhost")
          .set("Cookie", cookies!);
        expect(response.status).toBe(400);
      }
      expect(exchange).not.toHaveBeenCalled();
      const callback = `/auth/raindrop/callback?code=test&state=${state}`;
      const response = await request(app)
        .get(callback)
        .set("Host", "localhost")
        .set("Cookie", cookie);
      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
      const replay = await request(app)
        .get(callback)
        .set("Host", "localhost")
        .set("Cookie", cookie);
      expect(replay.status).toBe(400);
      const expired = await begin();
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 600_001);
      const expiredResponse = await request(app)
        .get(`/auth/raindrop/callback?code=test&state=${expired.state}`)
        .set("Host", "localhost")
        .set("Cookie", expired.cookie);
      expect(expiredResponse.status).toBe(400);
      expect(exchange).toHaveBeenCalledTimes(1);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    }
  });
});
