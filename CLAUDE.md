# CLAUDE.md - Raindrop MCP Project Guidelines

## Project Overview

Raindrop MCP is a Model Context Protocol (MCP) server that provides AI assistants with access to Raindrop.io bookmark management functionality. It supports both STDIO and HTTP transport and is packaged as an MCP Bundle (`.mcpb`).

## Version Information

- Current version: `2.4.1`
- Node.js: `>=18.0.0`
- Bun: `>=1.0.0`
- MCP SDK: `@modelcontextprotocol/sdk ^1.27.1`

## Core Features

- Full MCP protocol support with tools, resources, prompts, and capability registration.
- Modular tool definitions in `src/tools/` using declarative `defineTool()` patterns.
- Dynamic resources (`mcp://collection/{id}`, `mcp://raindrop/{id}`) fetched on demand.
- AI-assisted organization features (`get_suggestions`, `suggest_tags`).
- Safety confirmations for destructive actions (`empty_trash`, `cleanup_collections`, `remove_duplicates`).

## Entry Points

- `src/index.ts`: STDIO transport entry point.
- `src/server.ts`: HTTP transport entry point (port 3002).

## Architecture

### MCP Layer

- `src/services/raindropmcp.service.ts` handles capability registration, tool wiring, resources, and prompts.
- Capabilities must be registered before tool/resource handler registration.

### API Layer

- `src/services/raindrop.service.ts` is the Raindrop.io API client wrapper.
- Uses bearer token auth via `RAINDROP_ACCESS_TOKEN`.
- Includes rate limiting and typed error handling in `src/types/mcpErrors.ts`.

### Tool Modules

- `src/tools/bookmarks.ts`
- `src/tools/collections.ts`
- `src/tools/tags.ts`
- `src/tools/highlights.ts`
- `src/tools/bulk.ts`
- `src/tools/cleanup.ts`
- `src/tools/suggestions.ts`
- `src/tools/diagnostics.ts`

## Registered Tools

Current toolset in `src/tools/`:

- `diagnostics`
- `collection_list`
- `get_collection_tree`
- `collection_manage`
- `bookmark_search`
- `bookmark_manage`
- `get_raindrop`
- `list_raindrops`
- `get_suggestions`
- `suggest_tags`
- `bulk_edit_raindrops`
- `tag_manage`
- `highlight_manage`
- `library_audit`
- `empty_trash`
- `cleanup_collections`
- `remove_duplicates`

## Resource URIs

- `mcp://user/profile`
- `diagnostics://server`
- `mcp://collection/{id}`
- `mcp://raindrop/{id}`

## Development Commands

```bash
bun run dev
bun run dev:http
bun run build
bun run type-check
bun run test
bun run test:coverage
bun run test:e2e
bun run inspector
bun run inspector:http-server
bun run mcpb:pack
```

## MCP Configuration Example

```json
{
  "servers": {
    "raindrop": {
      "type": "stdio",
      "command": "npx",
      "args": ["@adeze/raindrop-mcp@latest"],
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

## Testing Guidance

- Tests are in `tests/` and use Vitest.
- Some integration/e2e tests require a valid `RAINDROP_ACCESS_TOKEN` in `.env`.
- Prefer running `bun run type-check` and `bun run test` before release.

## Release Checklist

1. Run type-check and tests.
2. Use Conventional Commits so semantic-release can calculate the next version.
3. Merge to `master` to trigger release in `.github/workflows/ci.yml`.
4. Ensure npm trusted publishing (OIDC) is configured for this repository/package.
5. Do not manually bump versions, push release tags, or publish npm directly for standard releases.

## References

- MCP docs: <https://modelcontextprotocol.io/>
- MCP TypeScript SDK: <https://github.com/modelcontextprotocol/typescript-sdk>
- MCPB spec: <https://github.com/anthropics/mcpb>
- Raindrop API: <https://developer.raindrop.io>
