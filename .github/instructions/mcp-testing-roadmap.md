# Complete Testing Roadmap for Raindrop MCP

## Vision

Create a comprehensive, maintainable testing strategy for Raindrop MCP that covers:

1. **Unit tests** - Tool handlers and service logic
2. **Integration tests** - MCP protocol compliance
3. **HTTP tests** - Real HTTP behavior
4. **Security tests** - DNS rebinding, input validation
5. **Performance tests** - Latency and throughput (future)

---

## Current State (Baseline)

### ✅ What You Have

- **Test Framework:** Vitest ^4.0.17 (excellent choice)
- **Protocol Testing:** InMemoryTransport (official SDK)
- **Manual Testing:** MCP Inspector (official tool)
- **Current Tests:** 18/28 passing (tools, services, schema)

### ❌ What's Missing

- **HTTP Tests:** No supertest integration yet
- **Security Tests:** DNS rebinding validation untested
- **Coverage Tracking:** No coverage reporting configured
- **CI Integration:** No automated testing in GitHub Actions
- **Documentation:** No testing guide for contributors

---

## Three-Phase Implementation Plan

### Phase 1: Foundation (Week 1 - This Week) ⏳ **IN PROGRESS**

**Goal:** Add HTTP endpoint testing with DNS rebinding validation

**Time:** 15 minutes

**Tasks:**

1. ✅ DNS rebinding protection implemented (src/server.ts)
2. ✅ Testing frameworks analysis complete
3. ⏳ Install Supertest
4. ⏳ Create HTTP security tests
5. ⏳ Verify all tests pass

**Deliverables:**

- `tests/integration/http-server-dns-protection.test.ts`
- Updated `package.json` test scripts
- All tests passing (25+/28)

**Commands:**

```bash
bun add -D supertest @types/supertest
bun test
```

---

### Phase 2: Expansion (Week 2-3) 📋 **PENDING**

**Goal:** Comprehensive HTTP and security test coverage

**Time:** 1-2 hours

**Tasks:**

1. HTTP tool execution tests
2. HTTP error handling tests
3. HTTP streaming (SSE) tests
4. Input validation tests
5. Resource endpoint tests
6. Tool handler edge cases

**Test Files to Create:**

```
tests/integration/
├── http-server-dns-protection.test.ts     ← Phase 1
├── http-server-tools.test.ts              ← Phase 2
├── http-server-errors.test.ts             ← Phase 2
├── http-server-sse.test.ts                ← Phase 2
└── http-server-resources.test.ts          ← Phase 2

tests/unit/
├── tools/
│   ├── collections.test.ts                ← Expand
│   ├── bookmarks.test.ts                  ← Expand
│   └── tags.test.ts                       ← Expand
└── services/
    ├── raindrop.service.test.ts           ← Expand
    └── raindropmcp.service.test.ts        ← Expand
```

**Coverage Goals:**

- Unit tests: 80%+ coverage
- Integration tests: All HTTP paths tested
- Security: DNS rebinding + input validation
- Protocol: All MCP operations validated

---

### Phase 3: Polish (Week 4) ✨ **FUTURE**

**Goal:** Production-grade testing infrastructure

**Time:** 2-3 hours

**Tasks:**

1. Configure coverage reporting (target 75%)
2. Add snapshot tests for schemas
3. Document testing patterns for contributors
4. Set up GitHub Actions CI testing
5. Add performance benchmarking
6. Configure codecov/coverage badge

**Deliverables:**

- `.github/workflows/test.yml` (CI pipeline)
- Coverage reports in GitHub
- Testing contribution guide
- Performance baselines

---

## Detailed Testing Strategy by Category

### Unit Tests (60% of pyramid)

**Current:** Some coverage exists  
**Goal:** Systematic coverage of all tool handlers

**Test Structure:**

```typescript
// tests/unit/tools/collections.test.ts
describe("Collection Tools", () => {
  // Arrange: Set up mocks
  const mockRaindropService = {
    getCollections: vi.fn().mockResolvedValue([]),
  };

  // Act + Assert: Test handler in isolation
  it("handles collection_list request", async () => {
    const result = await handleCollectionList({}, { raindropService });
    expect(result.content).toBeDefined();
  });

  // Test error handling
  it("handles service errors gracefully", async () => {
    const errorService = {
      getCollections: vi.fn().mockRejectedValue(new Error("API Error")),
    };
    const result = await handleCollectionList(
      {},
      { raindropService: errorService },
    );
    expect(result.content[0].text).toContain("error");
  });
});
```

**Coverage Goals by Tool:**

- collection\_\* (5 tools) → 80%+ coverage
- bookmark\_\* (8 tools) → 80%+ coverage
- tag\_\* (3 tools) → 80%+ coverage
- highlight\_\* (2 tools) → 80%+ coverage

---

### Integration Tests (30% of pyramid)

**Current:** Good MCP protocol coverage via InMemoryTransport  
**Goal:** Maintain + expand resource testing

**Test Structure:**

```typescript
// tests/integration/mcp.test.ts
describe("MCP Server via InMemoryTransport", () => {
  let client: Client;
  let service: RaindropMCPService;

  beforeEach(async () => {
    service = new RaindropMCPService();
    const transport = new InMemoryTransport(service.getServer());
    client = new Client({}, { capabilities: {} });
    await client.connect(transport);
  });

  // Protocol-level tests
  it("tools/list returns all tools", async () => {
    const result = await client.listTools();
    expect(result.tools.length).toBeGreaterThan(0);
  });

  // Tool call tests
  it("tools/call works for collection_list", async () => {
    const result = await client.callTool({
      name: "collection_list",
      arguments: {},
    });
    expect(result).toBeDefined();
  });

  // Resource tests
  it("resources/list returns all resources", async () => {
    const result = await client.listResources();
    expect(result.resources.length).toBeGreaterThan(0);
  });
});
```

---

### HTTP Tests (10% of pyramid) ⏳ **NEW**

**Current:** None  
**Goal:** Complete HTTP transport coverage

**Test Structure:**

```typescript
// tests/integration/http-server-dns-protection.test.ts
describe("HTTP Server - Security & Protocol", () => {
  let server: http.Server;

  beforeEach(() => {
    server = createServer(); // Your server setup
  });

  // DNS Rebinding tests
  describe("DNS Rebinding Protection", () => {
    it("blocks evil.com Host header", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "evil.com")
        .send(jsonRpcRequest);
      expect(res.status).toBe(403);
    });

    it("allows localhost Host header", async () => {
      const res = await request(server)
        .post("/mcp")
        .set("Host", "localhost")
        .send(jsonRpcRequest);
      expect(res.status).not.toBe(403);
    });
  });

  // HTTP protocol tests
  describe("MCP Over HTTP", () => {
    it("POST /mcp returns 200 for valid request", async () => {
      const res = await request(server)
        .post("/mcp")
        .send(jsonRpcRequest)
        .expect(200);
      expect(res.body.result).toBeDefined();
    });
  });
});
```

---

## Test Coverage Matrix

### By Tool Type

| Tool Category  | File                      | Test Count | Coverage Goal | Status     |
| -------------- | ------------------------- | ---------- | ------------- | ---------- |
| Collections    | collection\_\*.test.ts    | 5          | 80%           | ⏳ Phase 2 |
| Bookmarks      | bookmark\_\*.test.ts      | 8          | 80%           | ⏳ Phase 2 |
| Tags           | tag\_\*.test.ts           | 3          | 80%           | ⏳ Phase 2 |
| Highlights     | highlight\_\*.test.ts     | 2          | 80%           | ⏳ Phase 2 |
| Service Layer  | services/\*.test.ts       | 3          | 85%           | ⏳ Phase 2 |
| HTTP Transport | http-server-\*.test.ts    | 12         | 100%          | ⏳ Phase 1 |
| Security       | \*-dns-protection.test.ts | 5          | 100%          | ⏳ Phase 1 |

**Total Target:** 40+ tests, 80%+ coverage

---

## Test Execution Strategy

### Local Development

```bash
# Run all tests
bun test

# Run specific suite
bun test -- tests/unit/tools

# Watch mode (auto-rerun on file change)
bun test -- --watch

# Coverage report
bun test -- --coverage

# Only HTTP tests
bun run test:http
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Test & Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run type-check
      - run: bun test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## Best Practices Checklist

### Naming Conventions

- ✅ Test files: `*.test.ts` suffix
- ✅ Describe blocks: "Feature/Component" format
- ✅ It blocks: "should..." or "[verb] when..." format
- ✅ Mock objects: `mock*` or `*Mock` prefix

### Test Structure

- ✅ Arrange: Setup data/mocks
- ✅ Act: Execute function
- ✅ Assert: Verify results
- ✅ Cleanup: Reset state

### Coverage Goals

- ✅ Minimum: 75%
- ✅ Target: 85%
- ✅ Ideal: 90%+
- ✅ Exclude: node_modules, dist, types

### Error Cases

- ✅ Test success paths
- ✅ Test error handling
- ✅ Test edge cases
- ✅ Test boundary conditions

---

## Document References

| Document                           | Purpose                                 | Audience   | Read When            |
| ---------------------------------- | --------------------------------------- | ---------- | -------------------- |
| `mcp-testing-summary.md`           | Executive summary, why this approach    | Everyone   | Planning             |
| `mcp-testing-frameworks.md`        | Deep analysis of frameworks & libraries | Architects | Evaluating tools     |
| `http-server-testing-supertest.md` | Implementation guide with code          | Developers | Implementing Phase 1 |
| `mcp-testing-checklist.md`         | Quick action items                      | Developers | Executing Phase 1    |
| This document                      | Complete roadmap                        | Team leads | Planning all phases  |

---

## Success Metrics

### Phase 1 ✅

- [ ] Supertest installed
- [ ] DNS rebinding tests passing
- [ ] HTTP protocol tests passing
- [ ] Type-check passing
- [ ] Build succeeding
- [ ] All tests runnable via `bun test`

### Phase 2 📋

- [ ] Unit tests: 30+ tests, 80%+ coverage
- [ ] Integration tests: All resource types tested
- [ ] HTTP tests: All endpoints tested
- [ ] Security tests: All validation paths tested
- [ ] Coverage report accessible

### Phase 3 ✨

- [ ] GitHub Actions CI configured
- [ ] Coverage badge in README
- [ ] Testing guide in CONTRIBUTING.md
- [ ] Performance baselines established
- [ ] Contributors can add tests confidently

---

## Timeline Estimate

| Phase                | Duration       | Start          | Status         |
| -------------------- | -------------- | -------------- | -------------- |
| Phase 1 (Foundation) | 15 min         | Now            | ⏳ In Progress |
| Phase 2 (Expansion)  | 2-3 hours      | Next week      | 📋 Scheduled   |
| Phase 3 (Polish)     | 3-4 hours      | Following week | ✨ Future      |
| **Total**            | **~6-7 hours** | **This month** | **On track**   |

---

## Risk Mitigation

### Risk: Test Flakiness

**Mitigation:**

- Use isolated InMemoryTransport where possible
- Avoid timing-dependent assertions
- Mock external services (Raindrop API)

### Risk: Test Maintenance Burden

**Mitigation:**

- Start with critical paths only
- Use snapshot testing for schemas
- Document test patterns clearly

### Risk: CI Timeout

**Mitigation:**

- Tests should complete in <30 seconds
- Run in parallel where possible
- Monitor for regressions

---

## Conclusion

This roadmap provides a structured, achievable path to comprehensive test coverage.

**Immediate next step:** Complete Phase 1 this week by adding Supertest and HTTP security tests.

**Result:** Your Raindrop MCP will be tested at every layer (unit, integration, HTTP, security) with clear documentation for future contributors.
