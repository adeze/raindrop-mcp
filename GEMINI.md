# Raindrop MCP Server - Project Context

## Project Overview
This project is a Model Context Protocol (MCP) server for [Raindrop.io](https://raindrop.io/), a bookmark management service. It allows AI assistants (like Claude or Gemini) to interact with a user's Raindrop bookmarks, collections, tags, and highlights using natural language.

The server supports both **STDIO** (standard input/output) and **HTTP/SSE** (Server-Sent Events) transports, making it compatible with various MCP clients including Claude Desktop and custom integrations.

### Core Technologies
- **Runtime:** [Bun](https://bun.sh/) (primary) / Node.js
- **Language:** TypeScript
- **Frameworks:**
  - `@modelcontextprotocol/sdk`: For MCP protocol implementation.
  - `zod`: For input/output schema validation.
  - `express` / `node:http`: For the HTTP/SSE transport layer.
  - `axios` / `openapi-fetch`: For Raindrop.io API communication.
- **Testing:** `bun test` (Vitest compatible)

## Architecture
The project follows a modular service-oriented architecture:

- **Entry Points:**
  - `src/index.ts`: Main entry point for the **STDIO** transport server.
  - `src/server.ts`: Entry point for the **HTTP/SSE** server with session management and OAuth support.
- **Core Service (`src/services/raindropmcp.service.ts`):**
  - Manages the `McpServer` instance.
  - Registers tools, resources, and prompts.
  - Handles dynamic resource resolution.
- **API Service (`src/services/raindrop.service.ts`):**
  - Encapsulates direct communication with the Raindrop.io API.
  - Handles authentication (Access Token or OAuth).
- **Tools (`src/tools/`):**
  - Modular tool definitions using `defineTool`.
  - Categories: `bookmarks`, `collections`, `tags`, `highlights`, `diagnostics`, `bulk`.
- **Resources:**
  - Dynamic resources for individual bookmarks (`mcp://raindrop/{id}`) and collections (`mcp://collection/{id}`).
  - Static resources for user profile and server diagnostics.
- **Prompts:**
  - Built-in prompts for complex workflows like "organize_by_topic" or "find_duplicates".

## Key Commands

### Development
- `bun run dev`: Build and start the STDIO server in watch mode.
- `bun run dev:http`: Build and start the HTTP server in watch mode.
- `bun run build`: Bundle the project into the `build/` directory using Bun.
- `bun run type-check`: Run TypeScript compiler check.

### Testing
- `bun test`: Run all tests.
- `bun test:coverage`: Run tests with coverage reporting.
- `bun test:e2e`: Run end-to-end integration tests.

### MCP Tooling
- `bun run inspector`: Run the MCP Inspector on the STDIO server.
- `bun run inspector:http-server`: Run the MCP Inspector on the HTTP server.
- `bun run mcpb:pack`: Create an MCP Bundle (`.mcpb`) for Claude Desktop.

### Code Generation
- `bun run generate:schema`: Generate TypeScript types from the Raindrop OpenAPI spec (`raindrop-complete.yaml`).

## Deployment & CI/CD
The project uses GitHub Actions for automated deployment and quality checks:
- **CI (`.github/workflows/mcpjam-tests.yml`):** Runs tests and type checks on every push and PR.
- **Publishing (`.github/workflows/publish.yml`):** 
  - Triggered by pushing a version tag (e.g., `v2.3.2`).
  - Publishes the package to **npm** and **GitHub Packages**.
  - Creates a GitHub Release with the bundled code.
- **MCPB Release:** The `bun run release:mcpb` command creates an MCP Bundle (`.mcpb`) and uploads it to the GitHub Release for easy use in Claude Desktop.

## Debugging
The project includes pre-configured debugging tools for VS Code (`.vscode/`):
- **Launch Configurations:**
  - `Debug MCP STDIO Server`: Debugs the server running in STDIO mode.
  - `Debug STDIO mcp server with inspector`: Launches the MCP Inspector attached to the server for live tool testing.
  - `Debug MCPJam Integration Tests`: Specifically for debugging the end-to-end integration suite.
- **IDE Tasks:** `Ctrl+Shift+B` provides shortcuts for building, type checking, and starting development servers.

## Development Conventions

### Tool Definitions
Tools are defined using a shared `defineTool` helper which requires:
- `name`: Unique identifier (snake_case).
- `description`: Detailed explanation for the LLM.
- `inputSchema`: Zod object defining the expected arguments.
- `outputSchema`: Zod object defining the response structure.
- `handler`: Async function implementing the tool logic.

### Resource URIs
- Bookmark: `mcp://raindrop/{id}`
- Collection: `mcp://collection/{id}`
- User Profile: `mcp://user/profile`
- Diagnostics: `diagnostics://server`

### Error Handling
The project uses custom error classes in `src/types/mcpErrors.ts`:
- `ValidationError`: For invalid input parameters.
- `NotFoundError`: When a resource or item is missing.
- `UpstreamError`: For failures in the Raindrop.io API.

### Environment Variables
- `RAINDROP_ACCESS_TOKEN`: Required for API authentication.
- `HTTP_PORT`: Port for the HTTP server (default: 3002).
- `RAINDROP_CLIENT_ID` / `RAINDROP_CLIENT_SECRET`: For OAuth authentication.
