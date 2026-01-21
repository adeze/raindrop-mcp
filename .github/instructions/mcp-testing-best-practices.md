# MCP Testing Best Practices for VS Code

This guide covers modern testing strategies for Model Context Protocol (MCP) servers developed in VS Code using TypeScript, Bun, and Vitest.

## 1. Unit Testing with Vitest & In-Memory Transport

### Setup Minimal Test Environment

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/testing/inMemoryTransport.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("RaindropMCPService Tools", () => {
  let service: RaindropMCPService;
  let transport: InMemoryTransport;
  let client: Client;

  beforeEach(async () => {
    service = new RaindropMCPService();
    transport = new InMemoryTransport(service.getServer());
    client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      { capabilities: {} },
    );
    await client.connect(transport);
  });

  it("should list available tools", async () => {
    const tools = await client.listTools();
    expect(tools.tools.length).toBeGreaterThan(0);
    expect(tools.tools.map((t) => t.name)).toContain("collection_list");
  });

  it("should call a tool with valid input", async () => {
    const result = await client.callTool({
      name: "collection_list",
      arguments: {},
    });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});
```

### Key Testing Patterns

1. **In-Memory Transport**: Use for unit tests—no subprocess overhead, direct method invocation
2. **Server Capabilities**: Verify manifest before running tool tests
3. **Mock Context**: Provide mock `RaindropService` for isolated tool testing
4. **Error Handling**: Test both success and error paths with Zod validation

## 2. Integration Testing with MCP Inspector

### Launch Inspector in VS Code

1. **Terminal > Run Task > "Debug HTTP Server with Inspector"** (or STDIO variant)
   - Opens Inspector at `http://localhost:3000` (or via auto-opened browser)
   - Live tool/resource exploration with bidirectional message capture

2. **Manual Inspection Flow**:
   - Call `diagnostics` tool → view server version and enabled tools
   - Call `collection_list` → see resource links to collections
   - Read collection resources by URI → validate dynamic resource handling
   - Test tool inputs directly with Inspector's form interface

3. **Record & Replay**:
   - Inspector logs all requests/responses
   - Copy test cases directly into Vitest from Inspector logs
   - Validate against snapshot tests

### Using Inspector in Tests

```typescript
import { spawn } from "child_process";

it("should respond to MCP protocol messages via Inspector", async () => {
  const proc = spawn("bun", ["run", "inspector:http-server"], {
    cwd: process.cwd(),
    env: process.env,
  });

  // Wait for Inspector to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Send test requests to http://localhost:3000/messages
  const response = await fetch("http://localhost:3000/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  });

  const result = await response.json();
  expect(result.result?.tools).toBeDefined();
  expect(result.result.tools.length).toBeGreaterThan(0);

  proc.kill();
});
```

## 3. Snapshot Testing for Tool Schemas

```typescript
import { describe, it, expect } from "vitest";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Tool Schema Snapshots", () => {
  let service: RaindropMCPService;

  beforeEach(() => {
    service = new RaindropMCPService();
  });

  it("should maintain consistent tool schemas", async () => {
    const tools = await service.listTools();
    expect(tools).toMatchSnapshot();
  });
});
```

**Why Snapshot Testing?**

- Catches unintended schema changes (breaking for LLM clients)
- Auto-generates golden files for schema validation
- Reduces boilerplate when verifying complex schemas

## 4. Running Tests in VS Code

### Built-in Tasks

```json
{
  "label": "Run All Tests",
  "type": "shell",
  "command": "bun",
  "args": ["test"],
  "group": { "kind": "test", "isDefault": true },
  "problemMatcher": ["$vitest"]
}
```

### Run Tests with Coverage

```bash
bun run test:coverage
```

Generates coverage reports showing:

- Line & branch coverage for tools
- Uncovered error paths
- Integration test coverage vs unit test coverage

### Watch Mode During Development

```bash
bun test --watch
```

- Re-runs tests on file changes
- Ideal for TDD workflows
- Vitest provides formatted output in terminal

## 5. Load & Performance Testing

### Stress Test Tools with Concurrency

```typescript
it("should handle concurrent tool calls", async () => {
  const promises = Array.from({ length: 10 }, () =>
    client.callTool({
      name: "collection_list",
      arguments: {},
    }),
  );

  const results = await Promise.all(promises);
  expect(results).toHaveLength(10);
  expect(results.every((r) => r.content)).toBe(true);
});
```

### Measure Tool Latency

```typescript
it("should respond within acceptable latency", async () => {
  const start = performance.now();
  await client.callTool({
    name: "bookmark_search",
    arguments: { search: "test" },
  });
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(5000); // 5s timeout for API calls
});
```

## 6. Resource Testing

### Test Dynamic Resource Resolution

```typescript
it("should fetch and validate collection resources", async () => {
  const resources = await client.listResources();
  const collectionPattern = resources.resources.find((r) =>
    r.uri.includes("mcp://collection/"),
  );

  expect(collectionPattern).toBeDefined();

  // Read a specific collection
  const resourceData = await client.readResource({
    uri: "mcp://collection/12345",
  });

  expect(resourceData).toBeDefined();
  expect(Array.isArray(resourceData)).toBe(true);
  expect(resourceData[0].text).toBeDefined();
});
```

### Test Error Conditions

```typescript
it("should handle invalid resource URIs gracefully", async () => {
  expect(async () => {
    await client.readResource({ uri: "mcp://invalid/xyz" });
  }).rejects.toThrow();
});
```

## 7. Recommended Dev Dependencies

### Testing & Quality

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "happy-dom": "^13.0.0",
    "@testing-library/dom": "^10.0.0"
  }
}
```

### Code Quality & Linting

```json
{
  "devDependencies": {
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "prettier": "^3.0.0",
    "eslint-plugin-import": "^2.29.0"
  }
}
```

### Debugging & Inspection

```json
{
  "devDependencies": {
    "@modelcontextprotocol/inspector": "^1.0.0",
    "tsx": "^4.0.0"
  }
}
```

### Release & CI/CD

```json
{
  "devDependencies": {
    "semantic-release": "^23.0.0",
    "conventional-commits-parser": "^5.0.0"
  }
}
```

## 8. CI/CD Integration

### GitHub Actions Example

```yaml
name: Test & Build
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run type-check
      - run: bun test --coverage
      - run: bun run build

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run format:check
```

## 9. Debugging Tips

### Enable Verbose Logging

```bash
MCP_DEBUG=true bun run src/index.ts
```

### Use VS Code Debugger

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["--inspect-brk"],
      "skipFiles": ["<node_internals>/**"],
      "outputCapture": "std"
    }
  ]
}
```

### Inspect MCP Message Flow

```typescript
// In service constructor
this.server.server.setRequestHandler(MyRequestSchema, async (req) => {
  console.log("📩 Request:", JSON.stringify(req, null, 2));
  const response = await handler(req);
  console.log("📤 Response:", JSON.stringify(response, null, 2));
  return response;
});
```

## 10. Best Practices Checklist

- ✅ Use **in-memory transport** for unit tests (no subprocess overhead)
- ✅ Use **Inspector** for interactive exploration and validation
- ✅ **Snapshot test** tool schemas to catch breaking changes
- ✅ **Test error paths** with invalid input and edge cases
- ✅ **Mock external dependencies** (Raindrop API, authentication)
- ✅ **Measure latency** for performance-critical tools
- ✅ **Use type-safe assertions** with Zod schema validation
- ✅ **Run tests in CI/CD** before deployment
- ✅ **Keep tests focused** on one concern per test
- ✅ **Use meaningful test names** that describe the scenario

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Vitest Documentation](https://vitest.dev)
- [Bun Testing](https://bun.sh/docs/test/basics)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/debugging)
