---
applyTo: "**"
---

# GitHub Copilot & AI Assistant Instructions

## General Coding Principles

- Write modular, well-documented, maintainable code with complete implementations
- Use modern, type-safe, idiomatic TypeScript with interfaces and camelCase/PascalCase naming
- Use Zod for schema validation; async/await for all asynchronous operations
- Group imports: external first, then internal
- Use try/catch with descriptive error messages
- Reference documentation or example repos for ambiguous requirements

## API Coverage & References

- **Raindrop.io**: [API docs](https://developer.raindrop.io), [GitHub repo](https://github.com/raindropio/app), [LLM docs](https://context7.com/context7/developer_raindrop_io/llms.txt)
- **MCP Protocol**: [Official docs](https://modelcontextprotocol.io/), [LLM guide](https://modelcontextprotocol.io/llms-full.txt), [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- **MCP Examples**: [Server examples](https://github.com/modelcontextprotocol/servers), [TypeScript SDK examples](https://github.com/modelcontextprotocol/typescript-sdk/src/examples/README.md)
- **Tools**: [Inspector](https://github.com/modelcontextprotocol/inspector), [Debugging guide](https://modelcontextprotocol.io/docs/tools/debugging)
- **Templates**: [MCP boilerplate](https://github.com/cyanheads/mcp-ts-template)

## Project Structure

```
src/
  ├── index.ts              # STDIO entry point
  ├── server.ts             # HTTP/SSE entry point
  ├── connectors/           # External integrations (OpenAI)
  ├── services/
  │   ├── raindrop.service.ts     # Raindrop.io API client
  │   └── raindropmcp.service.ts  # MCP server implementation
  ├── types/                # TypeScript types and Zod schemas
  └── utils/                # Logger and utilities
tests/                     # All test files (Vitest)
build/                     # Compiled output
```

## Development Best Practices

- Use `bun` for package management (not npm): `bun install`, `bun run <script>`
- Structure tools with clear Zod schemas, validation, and consistent JSON responses
- Prefer declarative patterns and reuse existing `toolConfigs` in `raindropmcp.service.ts`
- Reduce duplication with helper functions; favor composition over inheritance
- Follow MCP Protocol and DXT specification for compatibility

## Testing & Quality

- **Testing**: [Vitest](https://vitest.dev/) with `bun test` or `bun test --coverage`
- Validate tool calls return properly structured responses
- Verify manifest loads correctly and host integration works
- Run `bun run type-check` before committing

## Development Scripts

- **Dev**: `bun run dev` (STDIO watch), `bun run dev:http` (HTTP watch)
- **Build**: `bun run build` (outputs to `build/`)
- **Test**: `bun run test`, `bun run test:coverage`
- **Type check**: `bun run type-check`
- **Inspector**: `bun run inspector` (STDIO), `bun run inspector:http-server` (HTTP)
- **Generate**: `bun run generate:schema`, `bun run generate:client`
- **Update deps**: `bun run update:deps` (auto), `bun run update:deps:interactive`
- **Versioning**: `bun run bump:patch|minor|major`
- **Package**: `bun run dxt:pack`, `bun run release:dxt`

## Code Requirements

- Generate complete, production-ready code that can be immediately tested
- Defensive programming with clear error messages
- Simplest solution that leverages existing libraries and patterns
- Configuration and declarative programming over imperative approaches
