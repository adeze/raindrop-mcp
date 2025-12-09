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
- **Optimized Tools**: Enhanced tool structure with 9 core tools using modern `resource_link` patterns for efficient data access.
- **AI-Friendly Interface**: Clear naming conventions and comprehensive parameter documentation.
- **Streaming Support**: Provides real-time SSE (Server-Sent Events) endpoints for streaming bookmark updates.
- **Built with TypeScript**: Strong typing for better maintainability.
- **Uses Axios**: For making requests to the Raindrop.io API.
- **Uses Zod**: For robust schema validation of API parameters and responses.
- **Uses MCP SDK**: Leverages the official `@modelcontextprotocol/sdk`.

## Recent Fixes & Improvements

### November 2025 (v2.0.16)

**Critical Schema Registration Fix**
- ✅ **Fixed:** MCP SDK schema registration causing `._def` null reference errors
- ✅ **Solution:** Restored `.shape` extraction for proper ZodRawShape handling
- ✅ **Impact:** All 10 tools now work correctly in both Claude Desktop and Claude Code
- 📚 **Documentation:** See [docs/MCP_SDK_INTEGRATION.md](docs/MCP_SDK_INTEGRATION.md) for technical details

**Tag Search Accuracy Improvement**
- ✅ **Fixed:** 87% false positive rate in tag search (23 results → 3 results)
- ✅ **Added:** `exactTagMatch` boolean parameter for client-side filtering
- 🎯 **Impact:** Dramatically improved search precision for tagged bookmarks

**Bulk Edit Authorization Fix**
- ✅ **Fixed:** 100% failure rate in bulk edit operations
- ✅ **Added:** Missing Authorization header to bulk edit requests
- 🔧 **Impact:** Bulk tag updates and bookmark management now fully functional

**Zod Version Compatibility**
- ✅ **Fixed:** Invalid Zod version (^4.1.9 doesn't exist)
- ✅ **Downgraded:** To Zod ^3.23.8 (stable and MCP SDK compatible)
- 🛡️ **Impact:** Eliminated schema validation errors at startup

For troubleshooting common issues, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

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

Connect your MCP client (like an LLM agent) to the running server process via stdio. The server exposes the following resource patterns:

### **Static Resources:**
- `mcp://user/profile` - User account information
- `diagnostics://server` - Server diagnostics and environment info

### **Dynamic Resources:** 
- `mcp://collection/{id}` - Access any Raindrop collection by ID (e.g., `mcp://collection/123456`)
- `mcp://raindrop/{id}` - Access any Raindrop bookmark by ID (e.g., `mcp://raindrop/987654`)

### **Available Tools (10 total):**
- **diagnostics** - Server diagnostic information
- **collection_list** - List all collections (returns `resource_link` to individual collections)
- **collection_manage** - Create, update, or delete collections
- **bookmark_search** - Search bookmarks (returns `resource_link` to individual bookmarks)  
- **bookmark_manage** - Create, update, or delete bookmarks
- **tag_manage** - Rename, merge, or delete tags
- **highlight_manage** - Create, update, or delete highlights
- **getRaindrop** - Fetch single bookmark by ID (legacy)
- **listRaindrops** - List bookmarks for collection (legacy)
- **bulk_edit_raindrops** - Bulk update tags, favorite status, media, cover, or move bookmarks to another collection.

### Bulk Edit Tool Usage

**Tool Name:** `bulk_edit_raindrops`

Bulk update multiple bookmarks in a collection. Supports updating tags, favorite status, media, cover, and moving bookmarks to another collection.

**Input Schema:**
```json
{
  "collectionId": 123456,                // Collection to update raindrops in
  "ids": [987654, 876543],               // (Optional) Array of raindrop IDs to update
  "important": true,                     // (Optional) Mark as favorite
  "tags": ["work", "urgent"],           // (Optional) Tags to set (empty array removes all tags)
  "media": ["https://img.com/a.png"],   // (Optional) Media URLs (empty array removes all media)
  "cover": "<screenshot>",              // (Optional) Cover URL
  "collection": { "$id": 654321 },      // (Optional) Move to another collection
  "nested": false                        // (Optional) Include nested collections
}
```

**Example Usage:**
- Update tags and favorite status for two bookmarks:
```json
{
  "collectionId": 123456,
  "ids": [987654, 876543],
  "tags": ["project", "review"],
  "important": true
}
```
- Remove all tags from all bookmarks in a collection:
```json
{
  "collectionId": 123456,
  "tags": []
}
```
- Move bookmarks to another collection:
```json
{
  "collectionId": 123456,
  "ids": [987654, 876543],
  "collection": { "$id": 654321 }
}
```

**Response:**
Returns a text message indicating success and the number of modified bookmarks.
```json
{
  "content": [
    { "type": "text", "text": "Bulk edit successful. Modified: 2" }
  ]
}
```

The modern tools use the efficient `resource_link` pattern - they return lightweight links to resources instead of full data, allowing clients to fetch complete data only when needed via the dynamic resource URIs.

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

## 📋 Recent Enhancements (v2.0.12)

### **MCP Resource Links Implementation** ✨ NEW
- **Modern `resource_link` pattern** following MCP SDK v1.17.2 best practices
- **Efficient data access** - tools return lightweight links instead of full data payloads
- **Better performance** - clients fetch full bookmark/collection data only when needed
- **Seamless integration** with existing dynamic resource system (`mcp://raindrop/{id}`)

### **SDK & API Updates**
- **Updated to MCP SDK v1.17.2** with latest protocol features
- **Modern tool registration** using `registerTool()` API with proper descriptions
- **Fixed API endpoints** - corrected Raindrop.io API path parameters
- **Enhanced tool implementations** - all 9 tools now fully functional

### **Tool Optimization** 
- **Resource-efficient responses** - bookmark/collection lists return `resource_link` objects
- **Dynamic resource access** - `mcp://collection/{id}` and `mcp://raindrop/{id}` patterns
- **Better UX** - clients can display lists without loading full data
- **MCP compliance** - follows official SDK patterns and examples

### **Service Layer Improvements**
- **25-30% code reduction** through extracted common functions and patterns
- **Consistent error handling** with standardized response processing
- **Enhanced type safety** with generic response handlers
- **Centralized endpoint building** for better API consistency

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
