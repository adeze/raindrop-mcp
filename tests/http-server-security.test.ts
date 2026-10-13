import { describe, it, expect, vi } from "vite-plus/test";
import request, { type Response } from "supertest";
import { app } from "../src/server.js";

const responseBody = (response: Response) => {
  const data = response.text
    ?.split("\n")
    .find((line) => line.startsWith("data: "));
  return data ? JSON.parse(data.slice(6)) : response.body;
};

describe("HTTP Server - Security (DNS Rebinding Protection)", () => {
  const server = app;

  describe("Host Header Validation", () => {
    it("allows requests from localhost", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(responseBody(res).result).toBeDefined();
      expect(responseBody(res).result.tools).toBeDefined();
    });

    it("allows requests from 127.0.0.1", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "127.0.0.1:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(responseBody(res).result).toBeDefined();
    });

    it("allows requests from IPv6 localhost (::1)", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "[::1]:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(responseBody(res).result).toBeDefined();
    });

    it("blocks requests from arbitrary Host header (DNS rebinding attack)", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "evil.attacker.com:8080")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(403);
      expect(responseBody(res).error).toBeDefined();
      expect(responseBody(res).error.message).toContain("Invalid Host");
      expect(responseBody(res).error.code).toBe(-32000);
    });

    it("blocks requests with suspicious Host header", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "malicious.example.com")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.status).toBe(403);
      expect(responseBody(res).error.message).toContain("Invalid Host");
    });

    it("handles missing Host header gracefully", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.status).toBe(403);
      expect(responseBody(res).error.message).toContain("Missing Host");
    });

    it("blocks requests from localhost when spoofed with port", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost@evil.com:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      // The @ should not be in the hostname part split by ':'
      expect(res.status).toBe(403);
    });

    it("respects ALLOWED_HOSTS environment variable", async () => {
      // Temporarily set environment variable
      const originalAllowedHosts = process.env.ALLOWED_HOSTS;
      process.env.ALLOWED_HOSTS = "custom.example.com,myserver.local";

      // Create a new server with the updated env var
      vi.resetModules();
      const { app: testServer } = await import("../src/server.js");

      const res = await request(testServer)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "custom.example.com:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.status).toBe(200);
      expect(responseBody(res).result).toBeDefined();

      // Cleanup
      if (originalAllowedHosts === undefined) {
        delete process.env.ALLOWED_HOSTS;
      } else {
        process.env.ALLOWED_HOSTS = originalAllowedHosts;
      }
      testServer.close();
    });
  });

  describe("MCP Protocol Over HTTP", () => {
    it("POST /mcp handles tools/list request", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(responseBody(res).jsonrpc).toBe("2.0");
      expect(responseBody(res).result).toBeDefined();
      expect(responseBody(res).result.tools).toBeInstanceOf(Array);
      expect(responseBody(res).id).toBe(1);
    });

    it("POST /mcp handles resources/list request", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(responseBody(res).result).toBeDefined();
      expect(responseBody(res).result.resources).toBeInstanceOf(Array);
    });

    it("POST /mcp returns error for unknown method", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 3,
          method: "unknown/method",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(responseBody(res).error).toBeDefined();
      expect(responseBody(res).error.code).toBe(-32601);
      expect(responseBody(res).error.message).toContain("Method not found");
    });

    it("POST /mcp handles invalid JSON gracefully", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost")
        .set("Content-Type", "application/json")
        .send("{invalid json}");

      expect(res.status).toBe(400);
      expect(responseBody(res).error).toBeDefined();
      expect(responseBody(res).error.code).toBe(-32700);
    });
  });

  describe("CORS Headers", () => {
    it("includes CORS headers in response", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      expect(res.headers["access-control-allow-methods"]).toContain("POST");
    });

    it("handles OPTIONS request for CORS preflight", async () => {
      const res = await request(server)
        .options("/mcp")
        .set("Host", "localhost");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("HTTP Methods", () => {
    it("rejects GET requests to /mcp", async () => {
      const res = await request(server).get("/mcp").set("Host", "localhost");

      expect(res.status).toBe(405);
    });

    it("allows POST requests to /mcp", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("MCP-Protocol-Version", "2025-11-25")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.status).toBe(200);
    });
  });
});
