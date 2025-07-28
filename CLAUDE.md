# CLAUDE.md - Raindrop MCP Project Guidelines

## External References
- Raindrop.io API Documentation: [https://developer.raindrop.io](https://developer.raindrop.io)
- MCP Documentation: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)
- [Model Context Protocol with LLMs](https://modelcontextprotocol.io/llms-full.txt)
- [MCP Typescript SDK v1.9.0](https://github.com/modelcontextprotocol/typescript-sdk)
- [Example MCP servers repository](https://github.com/modelcontextprotocol/servers)
- [This project on GitHub](https://github.com/adeze/raindrop-mcp)

## Installation and Usage

### NPM Package
You can use this package directly from npm:
```bash
npx @adeze/raindrop-mcp
```

### Development Commands
- Build/Run: `bun run start` (or `bun run src/index.ts`)
- Development: `bun run dev` (watch mode)
- Type checking: `bun run type-check`
- Tests: `bun run test`
- Run single test: `bun test src/tests/mcp.service.test.ts`
- Test with coverage: `bun run test:coverage`
- Debug: `bun run debug` or `bun run inspector` (runs with MCP inspector)
- Build: `bun run build` (builds to build directory)
- Clean: `bun run clean` (removes build directory)
- HTTP server: `bun run start:http` (starts with HTTP transport)

## Code Style
- TypeScript with strict type checking
- ESM modules (`import/export`) with `.js` extension in imports
- Use Zod for validation and schema definitions
- Use Axios for API requests
- Class-based services with dependency injection
- Functional controllers with try/catch error handling
- Use error objects with status codes and messages
- Resource-based MCP design using ResourceTemplate where appropriate

## Conventions
- Imports: Group imports by type (external, internal)
- Naming: camelCase for variables/functions, PascalCase for classes/types
- Error handling: Use try/catch blocks with descriptive error messages
- Type definitions: Prefer interfaces for object types
- Async: Use async/await pattern consistently
- Testing: Use Vitest with mocks for dependencies
- Tests should be co-located with source files in `src/tests` directory

## Project Structure
- Source code in `src/` directory
- Tests co-located with source files in `src/tests` directory
- Configuration in .env
- Types in `src/types`
- Services in `src/services`
- OpenAPI specification in `raindrop.yaml`
- Smithery configuration in `smithery.yaml`
- Tests are located in the tests/ folder

## MCP Resources
- Collections: `collections://all` and `collections://{parentId}/children`
- Tags: `tags://all` and `tags://collection/{collectionId}`
- Highlights: `highlights://all`, `highlights://all?page={pageNumber}&perPage={perPageCount}`, `highlights://raindrop/{raindropId}`, and `highlights://collection/{collectionId}`
- Bookmarks: `bookmarks://collection/{collectionId}` and `bookmarks://raindrop/{id}`
- User info: `user://info`
- User stats: `user://stats`

[Rest of the document remains the same...]