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
- **🌊 Streaming Support**: Comprehensive streaming capabilities for large datasets and long-running operations
  - **HTTP Streaming**: Server-Sent Events (SSE) and chunked transfer encoding
  - **STDIO Streaming**: Custom streaming format for MCP protocol
  - **Chunked Responses**: Large datasets automatically split into manageable chunks
  - **Progress Updates**: Real-time progress for export/import operations
  - **Smart Detection**: Automatic streaming for large response datasets
- **MCP Compliance**: Exposes Raindrop.io functionalities as MCP resources and tools.
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

## 🌊 Streaming Support

This server includes comprehensive streaming capabilities for handling large datasets and long-running operations efficiently:

### When Streaming is Used
- **Large Search Results**: Automatically chunks search results with >50 bookmarks
- **All Highlights**: Streams thousands of highlights in manageable chunks  
- **Export Operations**: Provides real-time progress updates for exports
- **Import Monitoring**: Streams import status and progress

### Streaming Tools
- `streamSearchBookmarks`: Search with chunked results for large datasets
- `streamHighlights`: Stream highlights with pagination support
- `streamExportBookmarks`: Export with real-time progress updates
- `streamImportStatus`: Monitor import progress with streaming updates
- `getStreamingCapabilities`: Get detailed streaming information

### Streaming Resources
- `highlights://stream/all`: All highlights with chunked loading
- `search://stream/{query}`: Search results with streaming support
- `highlights://stream/collection/{id}`: Collection highlights with streaming
- `highlights://stream/raindrop/{id}`: Raindrop highlights with streaming

### Transport Support
- **HTTP**: Full SSE streaming and chunked transfer encoding
- **STDIO**: Custom streaming message format with progress notifications

### Usage Examples
```bash
# Test streaming capabilities
npm run test:streaming

# Get streaming info via HTTP
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"getStreamingCapabilities"},"id":1}'

# Test streaming search
npm run streaming:test
```

For detailed streaming documentation, see [STREAMING.md](STREAMING.md).

## Development

- **Testing:** `npm test`
- **Type checking:** `npm run type-check`
- **Build:** `npm run build`
- **Development:** `npm run dev` (starts STDIO streaming transport)
- **Debug:** `npm run debug` or `npm run inspector`
- **HTTP server:** `npm run start:http` (optimized server with streaming)
- **Original HTTP server:** `npm run start:original` (port 3001)
- **Test streaming:** `npm run test:streaming`
- **Health check:** `npm run health`
- **Streaming capabilities:** `npm run streaming:capabilities`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📋 Recent Enhancements

- **[Tool Optimization](https://github.com/adeze/raindrop-mcp/issues/2)**: 37→24 tools with enhanced AI-friendly descriptions
- **[VS Code Configuration](https://github.com/adeze/raindrop-mcp/issues/3)**: Enterprise-grade testing & debugging support
