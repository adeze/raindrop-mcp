# Technology Stack

## Core

- **Language:** TypeScript
- **Runtime:** Bun (primary execution environment)
- **Architecture:** Model Context Protocol (MCP) Server

## Frameworks & Libraries

- **MCP SDK:** @modelcontextprotocol/sdk (v1.27.1)
- **Web Server:** Express (for HTTP/SSE transport support)
- **API Communication:** Axios, openapi-fetch
- **Data Validation:** Zod (schema-driven tool definitions)
- **Authentication:** simple-oauth2 (for upcoming OAuth integration)
- **Performance:** rate-limiter-flexible (upstream API protection)
- **Caching:** Keyv (in-memory caching with TTL support)

## Infrastructure & Tooling

- **Configuration:** dotenv
- **Testing:** Bun Test (Vitest-compatible runner)
- **Documentation:** TypeDoc
- **Build System:** Bun build (native bundling and sourcemaps)
- **CI/CD:** GitHub Actions
- **Automated Releases:** semantic-release
- **Git Hooks:** Husky, lint-staged
