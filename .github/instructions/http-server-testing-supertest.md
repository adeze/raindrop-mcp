# HTTP Server Testing with Supertest

Quick implementation guide for adding supertest to your Raindrop MCP server.

## Installation

```bash
bun add -D supertest @types/supertest
```

## Example: Testing DNS Rebinding Protection

Create `tests/integration/http-server-security.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import { createServer } from "../../src/server";

describe("HTTP Server - Security", () => {
  let server: http.Server;

  beforeAll(() => {
    server = createServer();
  });

  afterAll(() => {
    server.close();
  });

  describe("DNS Rebinding Protection", () => {
    it("allows requests from localhost", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        });

      expect(res.status).not.toBe(403);
    });

    it("allows requests from 127.0.0.1", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "127.0.0.1:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        });

      expect(res.status).not.toBe(403);
    });

    it("blocks requests from arbitrary Host header", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "evil.attacker.com:8080")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain("Invalid Host");
    });

    it("handles missing Host header", async () => {
      const res = await request(server).post("/mcp").unset("Host").send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain("Missing Host");
    });

    it("respects ALLOWED_HOSTS environment variable", async () => {
      process.env.ALLOWED_HOSTS = "custom.example.com,myserver.local";

      // Recreate server with new env var
      const testServer = createServer();

      const res = await request(testServer)
        .post("/mcp")
        .set("Host", "custom.example.com:3002")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        });

      expect(res.status).not.toBe(403);
      testServer.close();
    });
  });

  describe("MCP Protocol Endpoints", () => {
    it("POST /mcp handles tools/list", async () => {
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
      expect(res.body.result).toHaveProperty("tools");
      expect(Array.isArray(res.body.result.tools)).toBe(true);
    });

    it("POST /mcp handles resources/list", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "resources/list",
          params: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.result).toHaveProperty("resources");
    });
  });
});
```

## Example: Testing Tool Calls

Create `tests/integration/http-server-tools.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "http";
import { createServer } from "../../src/server";

describe("HTTP Server - Tool Execution", () => {
  let server: http.Server;

  beforeAll(() => {
    server = createServer();
  });

  afterAll(() => {
    server.close();
  });

  it("executes collection_list tool", async () => {
    const res = await request(server)
      .post("/mcp")
      .set("Host", "localhost")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "collection_list",
          arguments: {},
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
    expect(res.body.result.content).toBeDefined();
  });

  it("handles invalid tool calls", async () => {
    const res = await request(server)
      .post("/mcp")
      .set("Host", "localhost")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "nonexistent_tool",
          arguments: {},
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeDefined();
  });
});
```

## Update package.json Scripts

Add test script if not present:

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:http": "vitest --include '**/http-server*.test.ts'"
  }
}
```

## Run Tests

```bash
# All tests
bun test

# Only HTTP server tests
bun test:http

# Watch mode
bun test:watch

# With coverage
bun test:coverage
```

## Benefits of Supertest

✅ **Clean API** - Chainable request building  
✅ **Automatic Cleanup** - Handles server lifecycle  
✅ **Real HTTP** - Tests actual HTTP behavior (Host headers, status codes, etc.)  
✅ **No Port Management** - Automatically finds free port  
✅ **Perfect for Transport Testing** - Tests StreamableHTTPServerTransport

## Integration with CI

These tests can run in GitHub Actions:

```yaml
- name: Run HTTP Server Tests
  run: bun test:http

- name: Run All Tests
  run: bun test

- name: Generate Coverage
  run: bun test:coverage
```

## Next Steps

1. Install supertest: `bun add -D supertest @types/supertest`
2. Create test files above
3. Run `bun test:http` to verify
4. Add to CI/CD pipeline
5. Expand with more test cases as needed
