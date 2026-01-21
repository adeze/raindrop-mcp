# MCP Testing Frameworks & Helper Libraries

## Overview

This document analyzes testing frameworks and helper libraries specifically for MCP (Model Context Protocol) servers, comparing options and providing recommendations for the Raindrop MCP project.

---

## Current MCP Testing Landscape

**Status:** MCP is new (v1.x stable, v2 pre-alpha). Testing frameworks are still evolving.

**Baseline:** Most MCP servers use:

- **Vitest** for unit/integration testing (what you have ✓)
- **MCP Inspector** for interactive testing (what you have ✓)
- **In-Memory Transport** for isolated testing (what you have ✓)

**Gap:** No widely-adopted MCP-specific testing framework yet. Most projects build custom test utilities.

---

## Testing Strategies for MCP

### 1. In-Memory Transport Testing (Current Best Practice)

**What it is:** Connect test client to MCP server via memory instead of network.

**Why it's good:**

- ✅ No subprocess overhead
- ✅ Deterministic, fast (10-50ms per test)
- ✅ Perfect for unit/integration testing
- ✅ Works with Vitest
- ✅ You're already using it

**Example (from your current tests):**

```typescript
import { InMemoryTransport } from "@modelcontextprotocol/sdk/testing/inMemoryTransport.js";

const transport = new InMemoryTransport(service.getServer());
const client = new Client({ name: "test" }, { capabilities: {} });
await client.connect(transport);

// Now test directly
const tools = await client.listTools();
```

**Library Support:** Built into `@modelcontextprotocol/sdk` ✓

---

### 2. HTTP Server Testing (For Streamable HTTP)

**What it is:** Test your HTTP endpoint with fetch/axios without spinning up a real server.

**Recommended Approaches:**

#### Option A: Use `http.Server` directly (Minimal)

```typescript
import http from "http";
import { test, expect } from "vitest";

test("POST /mcp responds to MCP request", async () => {
  // Start test server
  const server = http.createServer(yourRequestHandler);
  const port = await new Promise((resolve) => {
    server.listen(0, () => {
      resolve(server.address().port);
    });
  });

  // Make request
  const response = await fetch(`http://localhost:${port}/mcp`, {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 1 }),
  });

  expect(response.status).toBe(200);
  server.close();
});
```

**Pros:** Zero dependencies, tests real HTTP behavior  
**Cons:** Verbose, manual server setup

#### Option B: Use `supertest` (Recommended for Node.js)

```typescript
import request from "supertest";

test("POST /mcp", async () => {
  const res = await request(server)
    .post("/mcp")
    .send({ jsonrpc: "2.0", method: "initialize", id: 1 })
    .expect(200);

  expect(res.body).toHaveProperty("result");
});
```

**Install:**

```bash
bun add -D supertest @types/supertest
```

**Pros:** Clean API, handles lifecycle, popular  
**Cons:** Adds dependency

#### Option C: `msw` (Mock Service Worker) for advanced scenarios

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.post("http://localhost:3002/mcp", ({ request }) => {
    // Intercept and test
    return HttpResponse.json({
      /* response */
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Install:**

```bash
bun add -D msw
```

**Pros:** Powerful mocking, intercepts all requests  
**Cons:** Overkill for simple testing, more complex

---

## Specialized MCP Testing Libraries

### 1. **@modelcontextprotocol/sdk/testing** (Built-in)

**What it provides:**

- `InMemoryTransport` - Direct client/server connection
- Test utilities for developing MCP servers

**Status:** Official, maintained by Anthropic  
**Recommendation:** ✅ Use this (you already are)

---

### 2. **mcp-cli** (Community Tool)

**What it is:** CLI tool for testing MCP servers interactively.

**Install:**

```bash
npm install -g @trendyoltech/mcp-cli
```

**Use:**

```bash
mcp-cli --url http://localhost:3002/mcp
```

**Pros:**

- ✅ Easy interactive testing
- ✅ Alternative to MCP Inspector
- ✅ Good for quick validation

**Cons:**

- ⚠️ Not as feature-rich as Inspector
- ⚠️ Community-maintained (less stable)
- ❌ Not for automated testing

---

### 3. **MCP Inspector** (Official Tool)

**What it is:** Visual debugger for MCP protocol.

**Status:** Official Anthropic tool (you're already using ✓)

**Current Use:**

```bash
npx @modelcontextprotocol/inspector http://localhost:3002/mcp
```

**Strengths:**

- ✅ Most polished MCP testing tool
- ✅ Real-time request/response inspection
- ✅ Schema visualization
- ✅ Record & replay

**Limitations:**

- ❌ Not for automated CI testing (interactive only)
- ❌ Requires manual clicking

---

## Testing Framework Comparison

| Framework             | Purpose                  | Your Project      | Recommendation  |
| --------------------- | ------------------------ | ----------------- | --------------- |
| **Vitest**            | Unit/integration testing | ✅ Already using  | ✅ Keep it      |
| **InMemoryTransport** | Direct server testing    | ✅ Already using  | ✅ Expand usage |
| **supertest**         | HTTP endpoint testing    | ❌ Not using      | ⏳ Consider     |
| **msw**               | HTTP mocking             | ❌ Not using      | ❌ Overkill now |
| **MCP Inspector**     | Interactive testing      | ✅ Using manually | ✅ Keep for dev |
| **mcp-cli**           | Alternative to Inspector | ❌ Not needed     | ❌ Skip         |
| **Mocha/Jest**        | General testing          | ❌ Vitest better  | ❌ Don't switch |

---

## Recommended Testing Stack for Raindrop MCP

### Current (Good ✓)

```
✅ Vitest (fast, Bun-native)
✅ InMemoryTransport (direct testing)
✅ MCP Inspector (manual validation)
```

### Enhance With (Phase 2)

```
⏳ supertest (HTTP endpoint testing)
⏳ vitest-mock-extended (advanced mocking)
```

### Don't Add (Unnecessary)

```
❌ msw (too heavy)
❌ Jest (Vitest is better)
❌ mcp-cli (Inspector is better)
```

---

## Best Practices for MCP Testing

### 1. Test Pyramid for MCP

```
        /\
       /  \ Integration Tests (10%)
      /    \ - Full HTTP server
      /----\
     /      \ Contract Tests (30%)
    /        \ - InMemoryTransport
    /--------\
   /          \ Unit Tests (60%)
  /            \ - Tool handlers, schemas
  /------------\
```

### 2. Unit Testing MCP Tools

**Test the handler logic separately:**

```typescript
import { describe, it, expect } from "vitest";
import { handleCollectionList } from "../src/tools/collections";

describe("Collection Tools", () => {
  it("handleCollectionList returns collections", async () => {
    const mockRaindropService = {
      getCollections: vi.fn().mockResolvedValue([{ _id: 1, title: "Test" }]),
    };

    const result = await handleCollectionList(
      {},
      { raindropService: mockRaindropService },
    );

    expect(result.content).toBeDefined();
    expect(mockRaindropService.getCollections).toHaveBeenCalled();
  });
});
```

### 3. Integration Testing with InMemoryTransport

**Test tools via MCP protocol:**

```typescript
import { InMemoryTransport } from "@modelcontextprotocol/sdk/testing/inMemoryTransport.js";

describe("MCP Server Integration", () => {
  it("listTools returns all registered tools", async () => {
    const service = new RaindropMCPService();
    const transport = new InMemoryTransport(service.getServer());
    const client = new Client({}, { capabilities: {} });

    await client.connect(transport);
    const tools = await client.listTools();

    expect(tools.tools.length).toBeGreaterThan(0);
    expect(tools.tools.map((t) => t.name)).toContain("collection_list");
  });
});
```

### 4. HTTP Server Testing (New Recommendation)

**Test HTTP transport with supertest:**

```typescript
import request from "supertest";

describe("HTTP Server", () => {
  it("POST /mcp handles MCP requests", async () => {
    const res = await request(server)
      .post("/mcp")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      })
      .expect(200);

    expect(res.body.result).toHaveProperty("tools");
  });

  it("validates Host header for DNS rebinding protection", async () => {
    const res = await request(server)
      .post("/mcp")
      .set("Host", "evil.attacker.com")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      })
      .expect(403);

    expect(res.body.error).toBeDefined();
  });
});
```

### 5. Snapshot Testing for Tool Schemas

```typescript
describe("Tool Schemas", () => {
  it("tool manifest remains stable", async () => {
    const tools = await service.listTools();
    expect(tools).toMatchSnapshot();
  });
});
```

---

## Installation Roadmap

### Now (Already Have)

```json
{
  "devDependencies": {
    "vitest": "^4.0.17",
    "@modelcontextprotocol/sdk": "^1.25.3"
  }
}
```

### Phase 2 (Recommended - 10 min)

```bash
bun add -D supertest @types/supertest
```

### Phase 3 (Optional - Later)

```bash
bun add -D vitest-mock-extended
```

### Don't Add

```
msw, jest, mocha, mcp-cli
```

---

## Test Structure for Raindrop MCP

### Recommended File Organization

```
tests/
├── unit/
│   ├── tools/
│   │   ├── collections.test.ts
│   │   ├── bookmarks.test.ts
│   │   └── tags.test.ts
│   └── services/
│       └── raindrop.service.test.ts
├── integration/
│   ├── mcp-server.test.ts          # InMemoryTransport
│   └── http-server.test.ts         # HTTP endpoints
├── e2e/
│   └── mcp-protocol.test.ts        # Full workflows
└── fixtures/
    ├── mock-raindrop-service.ts
    └── test-data.ts
```

### Example Test File Structure

```typescript
// tests/integration/mcp-server.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/testing/inMemoryTransport.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { RaindropMCPService } from "../../src/services/raindropmcp.service";

describe("MCP Server - InMemoryTransport", () => {
  let service: RaindropMCPService;
  let transport: InMemoryTransport;
  let client: Client;

  beforeEach(async () => {
    service = new RaindropMCPService();
    transport = new InMemoryTransport(service.getServer());
    client = new Client(
      { name: "test-client", version: "1.0.0" },
      {
        capabilities: {},
      },
    );
    await client.connect(transport);
  });

  afterEach(async () => {
    await client.close();
  });

  describe("Tools", () => {
    it("lists all registered tools", async () => {
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThan(0);
    });

    it("calls collection_list tool", async () => {
      const result = await client.callTool({
        name: "collection_list",
        arguments: {},
      });
      expect(result).toBeDefined();
    });
  });

  describe("Resources", () => {
    it("lists available resources", async () => {
      const resources = await client.listResources();
      expect(resources.resources.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Performance Benchmarks

| Test Type          | Speed     | Network   | Good For                |
| ------------------ | --------- | --------- | ----------------------- |
| Unit (mocked)      | 5-10ms    | None      | Tool handlers           |
| InMemoryTransport  | 10-50ms   | None      | MCP protocol            |
| HTTP (supertest)   | 20-100ms  | Localhost | HTTP integration        |
| HTTP (real server) | 100-500ms | TCP       | E2E validation          |
| MCP Inspector      | N/A       | Manual    | Interactive exploration |

---

## CI/CD Integration Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run type-check
      - run: bun test # Unit + integration tests
      - run: bun test:coverage # Coverage report
      - uses: codecov/codecov-action@v3

  server-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run inspector --validate # Basic validation
```

---

## Recommendations Summary

### ✅ Keep (Working Well)

- Vitest for all testing
- InMemoryTransport for MCP testing
- MCP Inspector for manual validation

### ⏳ Add (Phase 2 - 10 min)

- `supertest` for HTTP endpoint testing
- Test DNS rebinding protection with supertest

### ❌ Skip (Not Needed)

- Additional testing frameworks
- HTTP mocking libraries (msw)
- MCP-specific test frameworks (none are mature yet)

### 📚 Reference

- [MCP Testing Guide](https://modelcontextprotocol.io/docs/tools/debugging)
- [Vitest Documentation](https://vitest.dev)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [SDK Testing Utilities](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/packages/client/src/testing)

---

## Next Steps

1. **Review current tests** - See what's already tested
2. **Add supertest** - Test HTTP endpoints including DNS rebinding
3. **Expand InMemoryTransport tests** - Add more tool coverage
4. **Set up CI testing** - Add test step to GitHub Actions
5. **Monitor MCP ecosystem** - New tools may emerge as MCP grows

---

## Questions to Clarify Testing Needs

1. **Coverage target?** (Currently: no coverage tracking)
2. **CI/CD needed?** (GitHub Actions configured?)
3. **Performance testing?** (Latency benchmarks?)
4. **Load testing?** (Concurrent requests?)
5. **Regression testing?** (Snapshot-based?)

Current recommendation: Start with supertest for HTTP, expand InMemoryTransport coverage.
