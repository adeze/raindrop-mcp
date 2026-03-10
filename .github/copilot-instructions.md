---
applyTo: "**"
---

# GitHub Copilot & AI Assistant Instructions

## Project Context

**Raindrop MCP** is a Model Context Protocol (v2025-11-25) server that integrates Raindrop.io bookmarks into AI assistants. It uses declarative tool registration, dynamic resource handling, and real-time API data fetching. Version: 2.4.1 | Node: >=18 | Build: Bun | Package: .mcpb

## Architecture: Big Picture

### Three-Layer Stack

**Layer 1: Transport** (`src/index.ts` | `src/server.ts`)

- STDIO (`index.ts`): Process I/O for desktop/CLI hosts. Validates `RAINDROP_ACCESS_TOKEN` early to prevent silent crashes.
- HTTP/SSE (`server.ts`): Port 3002, for web/testing. Requires authorization middleware.

**Layer 2: MCP Service** (`src/services/raindropmcp.service.ts`)

- **Registers capabilities FIRST** (line 133-148), then handlers. This is CRITICAL—the SDK overwrites capabilities if registration happens after handler setup.
- Capabilities: `resources: { subscribe: true, listChanged: true }`, `prompts: { listChanged: true }`, `tools: { listChanged: true }`, `experimental.elicitation`.
- Declares tools via `buildToolConfigs()` → modular tool modules in `src/tools/` → registered via `registerDeclarativeTools()`.
- Handles resources via `registerResourceHandlers()` for URIs like `mcp://collection/{id}` and `mcp://raindrop/{id}`.
- Prompts (`registerPromptHandlers()`) are static (organize_by_topic, find_duplicates, export_markdown) with role/content messages.

**Layer 3: API Client** (`src/services/raindrop.service.ts`)

- OpenAPI-fetch client with Bearer auth via `RAINDROP_ACCESS_TOKEN`.
- Rate limiter: 30 points/60sec (2 req/sec) via `rate-limiter-flexible`. Respects 401, 429, 404 errors with typed exceptions.
- Used by all tools; single instance shared across requests.

### Tool Module Pattern

Each tool file (`bookmarks.ts`, `collections.ts`, etc.) exports a `toolConfigs` array using the declarative `defineTool()` helper:

```typescript
export const bookmarkTools = [
  defineTool<InputType, OutputType>({
    name: "get_raindrop",
    description: "...",
    inputSchema: z.object({ id: z.string() }),
    outputSchema: z.object({ ... }),
    handler: async (args, { raindropService }) => { ... },
    execution: { taskSupport: "supported" } // Optional: task support flag
  }),
  // More tools...
]
```

**Key patterns:**

- All handlers are async, receive `(args, context)` where context includes `raindropService`.
- Input/output validated with Zod schemas (`.shape` extracted for MCP registration).
- Content payloads use `McpContent` type: `{ type: "text"; text: string }` or `{ type: "resource_link"; uri: "mcp://..."; ... }`.
- Helper functions: `textContent()`, `makeCollectionLink()`, `makeBookmarkLink()` in `common.ts`.

## Critical Implementation Details

**Capability Registration Order** (Lines 133-148 in raindropmcp.service.ts)

```typescript
// ✅ CORRECT: Call registerCapabilities() BEFORE all handler registrations
this.server.server.registerCapabilities({
  resources: { subscribe: true, listChanged: true },
  // ...
});
this.registerDeclarativeTools(); // Happens after
this.registerResourceHandlers(); // Happens after
```

Reverse this order and capabilities get overwritten—server fails with "does not support resources" error.

**Error Handling**

- Typed errors in `src/types/mcpErrors.ts`: `AuthError`, `NotFoundError`, `RateLimitError`, `UpstreamError`, `ValidationError`.
- Tool handlers catch and rethrow with descriptive messages. Use `try/catch` in `asyncHandler()` middleware.

**Resource Subscriptions**

- `registerResourceHandlers()` listens for `SubscribeRequest` → stores URI in `resourceSubscriptions` set.
- Resources are fetched live on-demand (no caching). `listChanged` capability triggers re-fetch notifications.

**Logging**

- Use `createLogger("component-name")` from `utils/logger.ts` instead of `console.log()`.
- Logs go to stderr to avoid polluting STDIO protocol stream.

## Development Workflow

**Start Development**

```bash
bun run dev              # STDIO server, watch mode
bun run dev:http         # HTTP server on :3002, watch mode
```

**Debug with MCP Inspector**

```bash
bun run inspector        # Launches MCP Inspector UI (STDIO)
bun run inspector:http-server  # Inspector for HTTP transport
```

**Test & Validate**

```bash
bun run test             # Run all Vitest tests
bun run test:coverage    # Coverage report
bun run type-check       # TypeScript validation (required pre-commit)
```

**Build & Package**

```bash
bun run build            # Compile to build/ (index.js, server.js)
bun run mcpb:pack        # Create raindrop-mcp.mcpb (standard format, ~34 MB)
bun run release          # Run semantic-release (CI-driven release flow)
```

## Code Style & Patterns

**Imports**: External dependencies first, then internal modules (internal relative imports use `./` and file extensions for ESM).

**Validation**: All tool inputs validated with Zod. Extract schema shape for MCP: `(config.inputSchema as z.ZodObject<any>).shape`.

**Async/Await**: Mandatory for all async operations. No callbacks or Promise chains.

**Defensive Checks**: Early validation (token in `index.ts`), type guards on responses, meaningful error messages.

**Declarative > Imperative**: Use `toolConfigs` arrays + `buildToolConfigs()` factory. Avoid runtime conditionals.

**Resource Links**: Use `mcp://collection/{id}` and `mcp://raindrop/{id}` URIs for deep linking; MCP client resolves them to live data.

## Testing Patterns

**Vitest** in `tests/`.

- Load `.env` with `config()` from `dotenv`.
- Test tool responses match output schema: `expect(result).toMatchObject({ ... })`.
- Integration tests hit real Raindrop API (requires `RAINDROP_ACCESS_TOKEN`).
- Test servers use `http.createServer()` for isolated HTTP testing (no child processes).

## API References

- **Raindrop**: [developer.raindrop.io](https://developer.raindrop.io)
- **MCP Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io/), spec v2025-11-25
- **MCP SDK**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) ^1.27.1
- **MCPB Format**: [github.com/modelcontextprotocol/mcpb](https://github.com/modelcontextprotocol/mcpb) (standard package format)
