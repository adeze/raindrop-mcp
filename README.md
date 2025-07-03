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
- **Streaming Support**: Provides real-time SSE (Server-Sent Events) endpoints for streaming bookmark updates.
- **Production-Ready STDIO Transport**: Clean protocol compliance with graceful shutdown and error handling.
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

The server uses standard input/output (stdio) for communication by default, listening for requests on stdin and sending responses to stdout. 

### STDIO Transport Features

- **Clean Protocol Compliance**: Only MCP protocol messages on stdout, all logging to stderr
- **Graceful Shutdown**: Handles SIGINT, SIGTERM, and uncaught exceptions
- **Proper Error Handling**: All errors logged to stderr with descriptive messages
- **Resource Cleanup**: Automatic cleanup on shutdown to prevent resource leaks

For detailed information about the STDIO transport implementation, see [STDIO_TRANSPORT.md](STDIO_TRANSPORT.md).

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
- **STDIO Testing:** `npm run test:stdio` (test STDIO transport compliance)
- **Error Testing:** `npm run test:stdio:errors` (test error handling and shutdown)
- **Type checking:** `bun run type-check`
- **Build:** `bun run build`
- **Development:** `bun run dev`
- **Debug:** `bun run debug` or `bun run inspector`
- **HTTP server:** `bun run start:http`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📋 Recent Enhancements

- **[STDIO Transport Improvements](https://github.com/adeze/raindrop-mcp/issues/6)**: Clean protocol compliance, graceful shutdown, proper error handling
- **[Tool Optimization](https://github.com/adeze/raindrop-mcp/issues/2)**: 37→24 tools with enhanced AI-friendly descriptions
- **[VS Code Configuration](https://github.com/adeze/raindrop-mcp/issues/3)**: Enterprise-grade testing & debugging support
