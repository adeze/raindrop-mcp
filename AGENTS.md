# Agent Operating Guide

## Shared Mission

Deliver production-ready enhancements to the Raindrop MCP server while preserving full MCP protocol compliance. Reuse existing patterns in `src/services/raindropmcp.service.ts` before creating new abstractions. Keep responses concise, cite relevant files/lines, and recommend verification steps after changes.

## Agent Roles & Guidelines

### Claude (Anthropic)

**Primary Reference**: `CLAUDE.md` for project overview, version info, capabilities, and architecture

- Mirror declarative `toolConfigs` pattern when adding tools/resources
- Reuse Zod schemas from `src/types/` for validation
- Validate destructive operations (delete, merge, etc.) with clear preconditions
- Provide meaningful error messages for all operations

### GitHub Copilot / Code Generation Agents

**Primary Reference**: `.github/copilot-instructions.md` for coding standards

- TypeScript + Bun + Vitest + Zod validation required
- Reference `.github/skills/` for domain-specific skills and workflows
- Sort imports: external → internal
- Use async/await consistently
- Use logging helpers (`utils/logger.ts`) instead of `console.log`

### Other LLM Operators (Cursor, ChatGPT, etc.)

- Follow Copilot guidelines unless targeting documentation/analysis
- Surface ambiguities about Raindrop API behavior to user
- Default to OpenAPI definitions in `raindrop-complete.yaml` for API contracts

## Development Workflow

### Quick Start Commands

```bash
# Install dependencies
bun install

# Development (watch mode)
bun run dev              # STDIO server
bun run dev:http         # HTTP server on :3002

# Testing & Quality
bun run test             # Run all tests
bun run test:coverage    # With coverage report
bun run type-check       # TypeScript validation

# Building & Running
bun run build            # Compile to build/
bun run start:prod       # Run production build

# Debugging
bun run inspector                # MCP Inspector (STDIO)
bun run inspector:http-server    # MCP Inspector (HTTP)

# Code Generation (only when OpenAPI spec changes)
bun run generate:schema   # Generate TypeScript types
bun run generate:client   # Generate Axios client

# Dependency Management
bun run update:deps                # Update all deps to latest
bun run update:deps:interactive    # Interactive updates
bun run bun:update                 # Conservative updates

# Release & Distribution
bun run bump:patch|minor|major    # Bump version
bun run dxt:pack                  # Package DXT bundle
bun run release:dxt               # Create GitHub release
bun run tag:version               # Tag & push version
```

### Project Architecture

**Entry Points**:

- `src/index.ts` - STDIO transport (main CLI entry)
- `src/server.ts` - HTTP/SSE transport (port 3002)

**Core Services**:

- `src/services/raindropmcp.service.ts` - MCP server implementation (tool/resource registration)
- `src/services/raindrop.service.ts` - Raindrop.io API client wrapper

**Testing**: All tests in `tests/` using Vitest. Update coverage when adding tools/resources.

## MCP Protocol & Resources

- **Centralized Management**: Tool registration and resource handling in `RaindropMCPService`
- **Dynamic Resources**: `mcp://collection/{id}`, `mcp://raindrop/{id}` fetch live data via `RaindropService`
- **Resource Links**: Tools use `resource_link` patterns for efficient data access
- **Authentication**: Requires `RAINDROP_ACCESS_TOKEN` environment variable (never hard-code)

## Documentation & Release Process

### When to Update Documentation

- **README.md** - User-facing features, installation, or usage changes
- **CLAUDE.md** - Version updates, architectural changes, or new capabilities
- **LOGGING_DIAGNOSTICS.md** - Logging behavior or diagnostic features
- **AGENTS.md** / **copilot-instructions.md** - Development workflow or tooling changes

### Release Checklist

1. Run `bun run type-check` and `bun run test` (all passing)
2. Update version in documentation if needed
3. Ensure manifest parity across STDIO/HTTP entry points
4. Build and test DXT package: `bun run dxt:pack`
5. Bump version: `bun run bump:patch|minor|major`
6. Create release: `bun run release:dxt`
7. Note any manual test steps or breaking changes
