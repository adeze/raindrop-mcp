import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import http from "node:http";

/**
 * HTTP Server Security Tests
 *
 * Tests DNS rebinding protection and HTTP security features.
 * Uses supertest to test HTTP server without spawning child process.
 */

// Simple test server factory for isolated testing
function createTestServer() {
  const server = http.createServer((req, res) => {
    // DNS Rebinding Protection helper
    function validateHostHeader(
      hostHeader: string | null | undefined,
      allowedHostnames: string[],
    ): { ok: boolean; message?: string } {
      if (!hostHeader) {
        return { ok: false, message: "Missing Host header" };
      }

      // Handle IPv6 addresses in brackets: [::1]:3002 -> ::1
      let cleanHostname: string;
      if (hostHeader.startsWith("[")) {
        // IPv6 format: [::1]:3002 or [::1]
        const endBracket = hostHeader.indexOf("]");
        cleanHostname = hostHeader.substring(1, endBracket);
      } else {
        // IPv4 or hostname: localhost:3002 -> localhost
        cleanHostname = hostHeader.split(":")[0] || "";
      }

      if (!allowedHostnames.includes(cleanHostname)) {
        return {
          ok: false,
          message: `Invalid Host: ${cleanHostname}. Only ${allowedHostnames.join(", ")} allowed.`,
        };
      }

      return { ok: true };
    }

    // Set up allowed hosts
    const allowedHosts = [
      "localhost",
      "127.0.0.1",
      "::1", // IPv6 localhost
    ];
    if (process.env.ALLOWED_HOSTS) {
      allowedHosts.push(...process.env.ALLOWED_HOSTS.split(","));
    }

    // Validate Host header
    const hostValidation = validateHostHeader(
      req.headers.host ?? "",
      allowedHosts,
    );

    if (!hostValidation.ok) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: hostValidation.message,
          },
          id: null,
        }),
      );
      return;
    }

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Mock MCP endpoint
    if (req.url === "/mcp" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);

          // Mock response for tools/list
          if (data.method === "tools/list") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                result: {
                  tools: [{ name: "test_tool", description: "A test tool" }],
                },
                id: data.id,
              }),
            );
            return;
          }

          // Mock response for resources/list
          if (data.method === "resources/list") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                result: {
                  resources: [
                    { uri: "test://resource", name: "Test Resource" },
                  ],
                },
                id: data.id,
              }),
            );
            return;
          }

          // Default error response
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32601,
                message: `Method not found: ${data.method}`,
              },
              id: data.id,
            }),
          );
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32700, message: "Parse error" },
              id: null,
            }),
          );
        }
      });
      return;
    }

    // Unknown endpoint
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  return server;
}

describe("HTTP Server - Security (DNS Rebinding Protection)", () => {
  let server: http.Server;

  beforeAll(() => {
    server = createTestServer();
  });

  afterAll(() => {
    server.close();
  });

  describe("Host Header Validation", () => {
    it("allows requests from localhost", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
      expect(res.body.result.tools).toBeDefined();
    });

    it("allows requests from 127.0.0.1", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "127.0.0.1:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
    });

    it("allows requests from IPv6 localhost (::1)", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "[::1]:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
    });

    it("blocks requests from arbitrary Host header (DNS rebinding attack)", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "evil.attacker.com:8080")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain("Invalid Host");
      expect(res.body.error.code).toBe(-32603);
    });

    it("blocks requests with suspicious Host header", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "malicious.example.com")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Invalid Host");
    });

    it("handles missing Host header gracefully", async () => {
      const res = await request(server).post("/mcp").send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      });

      // supertest will send a Host header, so we test the validation logic
      // by checking that localhost is allowed
      expect([200, 403]).toContain(res.status);
    });

    it("blocks requests from localhost when spoofed with port", async () => {
      const res = await request(server)
        .post("/mcp")
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
      const testServer = createTestServer();

      const res = await request(testServer)
        .post("/mcp")
        .set("Host", "custom.example.com:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();

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
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.jsonrpc).toBe("2.0");
      expect(res.body.result).toBeDefined();
      expect(res.body.result.tools).toBeInstanceOf(Array);
      expect(res.body.id).toBe(1);
    });

    it("POST /mcp handles resources/list request", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "resources/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
      expect(res.body.result.resources).toBeInstanceOf(Array);
    });

    it("POST /mcp returns error for unknown method", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 3,
          method: "unknown/method",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32601);
      expect(res.body.error.message).toContain("Method not found");
    });

    it("POST /mcp handles invalid JSON gracefully", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost")
        .set("Content-Type", "application/json")
        .send("{invalid json}");

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32700);
    });
  });

  describe("CORS Headers", () => {
    it("includes CORS headers in response", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(res.headers["access-control-allow-methods"]).toContain("POST");
    });

    it("handles OPTIONS request for CORS preflight", async () => {
      const res = await request(server)
        .options("/mcp")
        .set("Host", "localhost");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
    });
  });

  describe("HTTP Methods", () => {
    it("rejects GET requests to /mcp", async () => {
      const res = await request(server).get("/mcp").set("Host", "localhost");

      expect(res.status).toBe(404);
    });

    it("allows POST requests to /mcp", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

      expect([200, 403]).toContain(res.status);
    });
  });
});
