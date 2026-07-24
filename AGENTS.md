# Raindrop MCP — Codex Guide

TypeScript/Bun MCP server for Raindrop.io bookmarks. This is the canonical operating guide; `CLAUDE.md` and `.github/copilot-instructions.md` are compatibility pointers. Target MCP SDK v2 and protocol revision `2026-07-28`.

## Commands

```bash
bun install
bun run lint
bun run format:check
bun run type-check
bun run test
bun run build
```

Use Bun for project commands and dependency updates: `bun run update:deps`. Keep `bun.lock` committed. Do not manually version, tag, publish, or edit release artifacts; semantic-release owns releases on `master`.

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

CI uses Bun plus Node 22. Merge conventional commits to `master`; CI runs semantic-release and synchronizes `package.json`, `manifest.json`, `mcp.json`, `gemini-extension.json`, `antigravity-extension.json`, changelog, and the MCPB bundle.
