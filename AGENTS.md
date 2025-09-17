# Agent Operating Guide

## Shared Mission
- Deliver production-ready enhancements to the Raindrop MCP server while preserving full MCP protocol compliance.
- Prefer existing patterns in `src/services/raindropmcp.service.ts` and related modules before inventing new abstractions.
- Keep responses concise, cite relevant files/lines, and recommend verification steps (tests, builds) after changes.

## Primary Agent Briefs

### Claude (Anthropic)
- Use `CLAUDE.md` for the canonical project tour: current version, capabilities, tooling commands, and architectural notes.
- When adding tools or resources, mirror the declarative `toolConfigs` pattern and reuse the Zod schemas under `src/types/`.
- Validate destructive actions (collection/tag/delete) with clear preconditions and meaningful error messages.

### GitHub Copilot / Code Generation Agents
- Follow `.github/copilot-instructions.md` for style, dependency, and testing conventions (TypeScript + bun, Vitest, zod validation).
- Reference `.github/instructions/mcp-*.instructions.md` when working on MCP transports, refactors, or inspector tooling.
- Keep imports sorted (external→internal), prefer async/await, and avoid `console.log` in MCP-facing code—use existing logging helpers instead.

### Other LLM Operators (e.g., Cursor, ChatGPT)
- Defer to the same guidelines as Copilot unless a task explicitly targets documentation or analysis.
- Surface open questions back to the user when Raindrop API behavior is ambiguous; default to the OpenAPI definitions in `raindrop-complete.yaml`.

## Development Workflow
- Install & run with bun: `bun run dev`, `bun run start:prod`, `bun run build`, `bun run test`, `bun run type-check`.
- Generated assets: use `bun run generate:schema` or `bun run generate:client` only when the OpenAPI spec changes.
- Tests live in `tests/`; use Vitest and update coverage when new tools/resources are introduced.

## Protocol & Resource Notes
- MCP manifest, tool registration, and resource handling are centralized in `RaindropMCPService` (`src/services/raindropmcp.service.ts`).
- Dynamic resources (`mcp://collection/{id}`, `mcp://raindrop/{id}`) should stay lightweight and fetch live data via `RaindropService`.
- Authentication depends on the `RAINDROP_ACCESS_TOKEN` environment variable—never hard-code secrets.

## Documentation & Release Hygiene
- Update `README.md`, `CLAUDE.md`, or `LOGGING_DIAGNOSTICS.md` when behavior changes affect users or operators.
- Package/distribution tasks: `bun run dxt:pack` for DXT bundles, `bun run bump:<semver>` for version increments.
- Before proposing releases, ensure manifest parity across STDIO/HTTP entry points and note any outstanding manual test steps.
