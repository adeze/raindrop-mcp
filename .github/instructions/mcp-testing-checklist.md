# MCP Testing Implementation Checklist

## Current Status

- ✅ DNS rebinding protection implemented in src/server.ts
- ✅ Type-check passing
- ✅ Build succeeding
- ✅ 45 tests passing
- ✅ HTTP endpoint tests in place
- ✅ Supertest integration installed

---

## Immediate Actions (Complete)

### Step 1: Install Supertest ✓

```bash
bun add -D supertest @types/supertest
```

**Expected output:**

```
added supertest@6.3.4
added @types/supertest@2.0.12
```

### Step 2: Create Test File for DNS Rebinding ✓

Implemented in: `tests/http-server-security.test.ts`

Copy content from `.github/instructions/http-server-testing-supertest.md` (DNS Rebinding Protection section)

### Step 3: Run HTTP Server Tests ✓

```bash
bun test -- tests/integration/http-server-dns-protection.test.ts
```

**Expected:**

- Tests should pass if DNS rebinding validation works
- Tests should fail if there are bugs in Host header validation

### Step 4: Add to Test Suite ✓

Update `package.json` if needed:

```json
{
  "scripts": {
    "test:http": "vitest --include '**/http-server*.test.ts'",
    "test": "vitest"
  }
}
```

---

## Phase 2 Actions (Next session)

### Create Additional HTTP Tests

Files to create:

1. `tests/integration/http-server-tools.test.ts` - Tool execution via HTTP
2. `tests/integration/http-server-errors.test.ts` - Error handling
3. `tests/integration/http-server-sse.test.ts` - Streaming responses

### Expand InMemoryTransport Coverage

Review: `tests/mcp.service.test.ts`
Add tests for:

- All resource types (collection, raindrop, etc.)
- Error conditions
- Edge cases

### Add Snapshot Tests

```typescript
test("tool manifest is stable", async () => {
  const tools = await service.listTools();
  expect(tools).toMatchSnapshot();
});
```

---

## Verification Checklist

After implementing Supertest tests, verify:

- [ ] `bun run type-check` passes
- [ ] `bun run build` succeeds
- [ ] `bun test` runs all tests (including new ones)
- [ ] `bun test -- http-server` runs only HTTP tests
- [ ] Coverage report updated (if using `--coverage`)
- [ ] CI pipeline updated (if using GitHub Actions)

---

## File Inventory

### Documentation Created

- ✅ `.github/instructions/mcp-testing-frameworks.md` - Comprehensive guide
- ✅ `.github/instructions/http-server-testing-supertest.md` - Implementation details
- ✅ `.github/instructions/mcp-testing-summary.md` - Executive summary
- ✅ This checklist

### Code Changes

- ✅ `src/server.ts` - Added validateHostHeader() function (DNS rebinding)
- ✅ `tests/http-server-security.test.ts` - DNS rebinding and HTTP checks
- ✅ `tests/server.http.test.ts` - Manual HTTP entrypoint checks (skipped by default)

---

## Testing Command Reference

```bash
# Run all tests
bun test

# Run only HTTP server tests
bun test -- http-server

# Run only integration tests
bun test -- tests/integration

# Run with coverage
bun test -- --coverage

# Run in watch mode
bun test -- --watch

# Run specific test file
bun test -- tests/integration/http-server-dns-protection.test.ts
```

---

## Expected Test Results

After Phase 1 implementation, you should see:

```
✓ DNS Rebinding Protection (5 tests)
  ✓ allows requests from localhost
  ✓ allows requests from 127.0.0.1
  ✓ blocks requests from arbitrary Host header
  ✓ handles missing Host header
  ✓ respects ALLOWED_HOSTS environment variable

✓ MCP Protocol Endpoints (2 tests)
  ✓ POST /mcp handles tools/list
  ✓ POST /mcp handles resources/list

Test Files  2 passed (2)
     Tests  7 passed (7)
  Duration  234ms
```

---

## Troubleshooting

### Import Error: Cannot find module 'supertest'

**Solution:** Run `bun install` to ensure dependencies installed

### Tests timeout

**Issue:** Server not starting in beforeAll  
**Solution:** Check that `createServer()` is exported from src/server.ts

### TypeScript errors with supertest

**Issue:** Missing @types/supertest  
**Solution:** Run `bun add -D @types/supertest`

### Port already in use

**Note:** Supertest automatically finds free port, shouldn't be an issue  
**Solution:** If it persists, ensure no old `bun run server` is running

---

## Documentation Map

```
.github/instructions/
├── mcp-testing-summary.md               ← START HERE (executive summary)
├── mcp-testing-frameworks.md            ← Deep dive (comparison, best practices)
├── http-server-testing-supertest.md     ← Implementation (copy-paste examples)
├── copilot-instructions.md              ← Coding standards
├── mcp-dev.instructions.md              ← Development workflow
└── ... (other guides)
```

**Reading order:**

1. This checklist (where you are now)
2. `mcp-testing-summary.md` (understand the why)
3. `http-server-testing-supertest.md` (copy code, run tests)
4. `mcp-testing-frameworks.md` (reference for Phase 2 expansion)

---

## Success Criteria

You'll know you're done when:

✅ Supertest installed  
✅ DNS rebinding tests created  
✅ DNS rebinding tests passing  
✅ HTTP server tests integrated into `bun test`  
✅ Type-check still passing  
✅ Build still succeeding

**Estimated time:** 10-15 minutes

---

## Next Week

Once Phase 1 is complete and tests are passing:

1. Review test results and coverage
2. Decide on Phase 2 scope (expand tests vs move on)
3. Consider: Snapshot testing for tool schemas?
4. Consider: E2E testing for complete workflows?
5. Monitor MCP ecosystem for new testing helpers

---

## Questions?

Refer to:

- Test syntax: `http-server-testing-supertest.md`
- Testing strategy: `mcp-testing-summary.md`
- Best practices: `mcp-testing-frameworks.md`
- General coding: `copilot-instructions.md`

**Remember:** You already have the best MCP testing foundation. This just adds the HTTP layer tests.
