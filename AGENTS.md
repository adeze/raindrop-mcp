# Raindrop MCP — Codex Guide

TypeScript 7/Bun MCP server for Raindrop.io bookmarks, using Vite+ 1.1. This is the canonical operating guide; `CLAUDE.md` and `.github/copilot-instructions.md` are compatibility pointers. Target MCP SDK v2 and protocol revision `2026-07-28`.

## Commands

```bash
bun install --frozen-lockfile
bun run check
bun run lint
bun run format:check
bun run type-check
bun run test
bun run build
```

Run the irreversible live bookmark test only with an account authorized for it:

```bash
RUN_DESTRUCTIVE_LIVE_TESTS=true \
CONFIRM_DESTRUCTIVE_LIVE_TESTS=DELETE_ONLY_TEST_BOOKMARKS \
bunx vp test run tests/destructive.live.test.ts
```

It creates a uniquely tagged project URL, retrieves it by its returned ID, deletes it from the active library and Trash, then confirms it is absent. It never targets an existing bookmark.

Use Bun for project commands and dependency updates: `bun run update:deps`. Keep `bun.lock` committed. Do not manually version, tag, publish, or edit release artifacts; semantic-release owns releases on `master`.

Use Node 24.15+ and Bun 1.4.3+ for development; the published server requires Node 22.19+. `vite.config.ts` owns lint, formatting, tests, coverage, and `vp pack` configuration. Keep Vitest and coverage aligned with Vite+'s bundled version. `tooling/compiler-api` isolates TypeDoc's required TypeScript 6 compiler; the server uses TypeScript 7. Run `bun run docs` from the root.

## Architecture

- `src/index.ts`: v2 STDIO era-selection entry point; `src/server.ts`: v2 per-request Streamable HTTP handler.
- `src/services/raindropmcp.service.ts`: MCP capability, tool, resource, and prompt registration. Register capabilities before handlers.
- `src/tools/*.ts`: declarative tool modules, assembled by `src/tools/index.ts`.
- `src/services/raindrop.service.ts`: shared authenticated Raindrop API client, rate limit, and typed upstream errors.
- `tests/`: Vitest unit/integration coverage; E2E needs `RAINDROP_ACCESS_TOKEN`.

## Non-negotiable contracts

- Add tools through domain modules with `defineTool()`; use `snake_case`, Zod input/output schemas, async handlers, and the shared `RaindropService`.
- Destructive operations require `confirm: true`; preserve existing auth, HTTP security, rate-limit, and typed-error behavior.
- Prefer `mcp://collection/{id}` and `mcp://raindrop/{id}` resource content for list/detail links.
- Use `createLogger()` from `src/utils/logger.ts`; never write protocol output with `console.log`.
- Treat `raindrop-complete.yaml` as the Raindrop API contract. Regenerate types/client only when its OpenAPI input changes.
- Use `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, and `@modelcontextprotocol/node`; do not add the v1 monolithic SDK.

## Codex workflow

- Inspect current implementation and tests before changing protocol behavior. Use official MCP SDK/Raindrop documentation when an API contract is uncertain.
- Preserve unrelated working-tree changes. Keep diffs scoped; run focused tests while iterating, then `lint`, `format:check`, `type-check`, `test`, and `build` for cross-cutting changes.
- Update `README.md` for user-visible commands/features; update this file when architecture or contributor workflow changes.
- VS Code files and Copilot-era guidance are optional compatibility material, not the project control plane.

## Release

CI uses Bun plus Node 24 and frozen installs. Merge conventional commits to `master`; CI runs semantic-release and synchronizes `package.json`, `manifest.json`, `mcp.json`, `gemini-extension.json`, changelog, and the MCPB bundle.
