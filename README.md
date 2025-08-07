# Raindrop.io MCP Server

[![smithery badge](https://smithery.ai/badge/@adeze/raindrop-mcp)](https://smithery.ai/server/@adeze/raindrop-mcp)

This project provides a Model Context Protocol (MCP) server for interacting with the [Raindrop.io](https://raindrop.io/) bookmarking service. It allows Language Models (LLMs) and other AI agents to access and manage your Raindrop.io data through the MCP standard.

[![npm version](https://badge.fury.io/js/%40adeze%2Fraindrop-mcp.svg)](https://www.npmjs.com/package/@adeze/raindrop-mcp)

## Features

- **CRUD Operations**: Create, Read, Update, and Delete collections and bookmarks.
- **Advanced Search**: Filter bookmarks by various criteria like tags, domain, type, creation date, etc.
- **Tag Management**: List, rename, merge, and delete tags.
- **Highlight Access**: Retrieve text highlights from bookmarks.
- **Collection Management**: Reorder, expand/collapse, merge, and remove empty collections.
- **File Upload**: Upload files directly to Raindrop.io.
- **Reminders**: Set reminders for specific bookmarks.
- **Import/Export**: Initiate and check the status of bookmark imports and exports.
- **Trash Management**: Empty the trash.
- **MCP Compliance**: Exposes Raindrop.io functionalities as MCP resources and tools.
- **Optimized Tools**: Enhanced tool structure with 35% fewer tools (24 vs 37+) following MCP 2025 best practices.
- **AI-Friendly Interface**: Clear naming conventions and comprehensive parameter documentation.
- **Streaming Support**: Provides real-time SSE (Server-Sent Events) endpoints for streaming bookmark updates.
- **Built with TypeScript**: Strong typing for better maintainability.
- **Uses Axios**: For making requests to the Raindrop.io API.
- **Uses Zod**: For robust schema validation of API parameters and responses.
- **Uses MCP SDK**: Leverages the official `@modelcontextprotocol/sdk`.

## Prerequisites

- Node.js (v18 or later recommended) or Bun
- A Raindrop.io account
- A Raindrop.io API Access Token (create one in your [Raindrop.io settings](https://app.raindrop.io/settings/integrations))

## Installation and Usage

### Using NPX (Recommended)

You can run the server directly using npx without installing it:

```bash
# Set your API token as an environment variable
export RAINDROP_ACCESS_TOKEN=YOUR_RAINDROP_ACCESS_TOKEN

# Run the server
npx @adeze/raindrop-mcp
```

### From Source

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/adeze/raindrop-mcp.git
    cd raindrop-mcp
    ```

2.  **Install dependencies:**

    ```bash
    bun install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory by copying the example:

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file and add your Raindrop.io API Access Token:

    ```env
    RAINDROP_ACCESS_TOKEN=YOUR_RAINDROP_ACCESS_TOKEN
    ```

4.  **Build and Run:**
    ```bash
    bun run build
    bun start
    ```


## Inspector CLI & VS Code Integration

This project is designed for seamless debugging and protocol inspection using the [MCP Inspector CLI](https://github.com/modelcontextprotocol/inspector). For full instructions and best practices, see [`./github/prompts/inspector.prompt.md`](.github/prompts/inspector.prompt.md).

### MCP Inspector CLI Usage

- **List available tools:**
  ```bash
  npx -y @modelcontextprotocol/inspector --cli node build/index.js --method tools/list
  ```
- **Send protocol requests (e.g., ping):**
  ```bash
  npx -y @modelcontextprotocol/inspector --cli node build/index.js --method ping
  ```
- **Debug with Inspector:**
  - For STDIO server:
    ```bash
    npx -y @modelcontextprotocol/inspector node build/index.js
    ```
  - For HTTP server:
    ```bash
    npx -y @modelcontextprotocol/inspector node build/server.js
    ```

You can automate these flows in VS Code using launch configurations and tasks. See the prompt file for more advanced scenarios and flags.

---

The server uses standard input/output (stdio) for communication by default, listening for requests on stdin and sending responses to stdout.

## Usage with MCP Clients

Connect your MCP client (like an LLM agent) to the running server process via stdio. The server exposes the following resource URIs:

- `collections://all` - All collections
- `collections://{parentId}/children` - Child collections
- `tags://all` - All tags
- `tags://collection/{collectionId}` - Tags filtered by collection
- `highlights://all` - All highlights
- `highlights://raindrop/{raindropId}` - Highlights for a specific bookmark
- `highlights://collection/{collectionId}` - Highlights filtered by collection
- `bookmarks://collection/{collectionId}` - Bookmarks in a collection
- `bookmarks://raindrop/{id}` - Specific bookmark by ID
- `user://info` - User information
- `user://stats` - User statistics

It also provides numerous tools for operational tasks such as collection management, bookmark operations, tag management, highlight operations, and user operations. For a detailed list of all available tools, refer to `CLAUDE.md` or check `src/services/mcp.service.ts` for definitions of resources and tools.

### MCP Configuration

To use the Raindrop MCP server with your AI assistant or MCP-compatible client, you can add the following configuration to your `.mcp.json` file:

```json
"raindrop": {
  "command": "npx",
  "args": [
    "@adeze/raindrop-mcp@latest"
  ],
  "env": {
    "RAINDROP_ACCESS_TOKEN": "YOUR_RAINDROP_API_TOKEN"
  }
}
```

For Claude Code or other MCP-compatible clients, this will register the Raindrop server under the name "raindrop" and make all of its resources and tools available to your AI assistant.

## Development

- **Testing:** `bun test`
- **Type checking:** `bun run type-check`
- **Build:** `bun run build`
- **Development:** `bun run dev`
- **Debug:** `bun run debug` or `bun run inspector`
- **HTTP server:** `bun run start:http`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Architecture Overview

### Project Structure

- **Source:** `src/`
  - `index.ts`, `server.ts`: Entrypoints for STDIO and HTTP MCP servers.
  - `connectors/`: External service connectors (e.g., OpenAI).
  - `services/`: Business logic for Raindrop.io and MCP protocol (`raindrop.service.ts`, `raindropmcp.service.ts`).
  - `types/`: TypeScript types and schemas (MCP, Raindrop, OAuth, Zod).
  - `utils/`: Logging and shared utilities.
- **Build:** `build/`
  - Compiled output for deployment and inspection.
- **Tests:** `tests/`
  - All Vitest test files for services, connectors, and protocol compliance.

### Key Technologies & Patterns

- **TypeScript:** Type-safe, modular codebase.
- **Zod:** Schema validation for all API inputs/outputs.
- **Bun:** Package management, scripts, and runtime.
- **Vitest:** Testing framework for all logic and integration tests.
- **MCP Protocol:** Implements Model Context Protocol via STDIO and HTTP, exposing Raindrop.io as MCP resources and tools.
- **Inspector Tool:** Integrated for protocol debugging and inspection.
- **Defensive Programming:** Centralized error handling, explicit types, and robust validation.
- **Declarative Tooling:** Tools and resources are defined with clear schemas and documentation, following MCP and DXT specifications.

### Tool & Resource Design

- **Resources:** Exposed as MCP URIs (e.g., `collections://all`, `tags://all`, `highlights://raindrop/{id}`).
- **Tools:** Modular, context-aware, and AI-friendly. Reduced redundancy and grouped by category/action.
- **Service Layer:** Centralized business logic, endpoint construction, and error handling.
- **Connector Layer:** Handles external integrations (e.g., OpenAI).

### Development & Release

- **Scripts:** All build, test, and release scripts use Bun.
- **DXT Manifest:** Automated packaging and release via GitHub CLI.
- **Continuous Integration:** Version tagging and manifest publishing are fully automated.

## 📋 Recent Enhancements (v2.0.0)

### **Service Layer Refactoring**
- **25-30% code reduction** through extracted common functions and patterns
- **Consistent error handling** with standardized response processing
- **Enhanced type safety** with generic response handlers
- **Centralized endpoint building** for better API consistency

### **Tool Optimization** 
- **35% reduction** in tool count (37+ → 24 tools) with enhanced AI-friendly descriptions
- **Hierarchical naming** with `category_action` pattern for better organization
- **Comprehensive documentation** with detailed parameter descriptions and examples
- **Dynamic tools** providing context-aware recommendations

### **Developer Experience**
- **[VS Code Configuration](https://github.com/adeze/raindrop-mcp/issues/3)**: Enterprise-grade testing & debugging support
- **Enhanced error messages** with actionable suggestions
- **Standardized resource patterns** for consistent API interactions
- **Comprehensive diagnostic tools** for monitoring and debugging

## Automated Release & Tagging

This project uses Bun scripts and GitHub CLI to automate version tagging and DXT manifest release.

### Tagging the Current Version

Tags the current commit with the version from `package.json` and pushes it to GitHub:

```bash
# Bump version locally
bun run bump:patch  # 2.0.10 → 2.0.11

# Then either:
# Option A: Let workflow handle publishing
bun run tag:version  # Creates tag, triggers workflow

# Option B: Publish manually  
bun run build
bun run bun:publish:npm
bun run bun:publish:github
```

### Publishing the DXT Manifest to GitHub Releases

Creates a GitHub release for the current version and attaches the `raindrop-mcp.dxt` manifest:

```bash
bun run release:dxt
```

**Requirements:**
- [GitHub CLI](https://cli.github.com/) (`gh`) must be installed and authenticated.
- [`jq`](https://stedolan.github.io/jq/) must be installed (`brew install jq` on macOS).
- The `raindrop-mcp.dxt` file must exist in the project root.

**Scripts (in `package.json`):**
```json
"tag:version": "git tag v$(jq -r .version package.json) && git push origin v$(jq -r .version package.json)",
"release:dxt": "gh release create v$(jq -r .version package.json) raindrop-mcp.dxt --title \"Release v$(jq -r .version package.json)\" --notes \"DXT manifest for MCP\""
```

See [Model Context Protocol documentation](https://modelcontextprotocol.io/) and [Raindrop.io API docs](https://developer.raindrop.io) for more details.
