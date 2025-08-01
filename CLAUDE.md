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
- **Development**: `bun run dev` (watch STDIO mode) or `bun run dev:http` (watch HTTP mode)
- **Production**: `bun run start:prod` (from build) or `bun run run` (CLI executable)
- **HTTP Server**: `bun run start:http` (starts HTTP transport on port 3002)
- **Type checking**: `bun run type-check`
- **Testing**: `bun run test` or `bun run test:coverage`
- **Building**: `bun run build` (creates build/ directory with cli.js and server.js)
- **Debugging**: 
  - MCP Inspector STDIO: `bun run inspector`
  - MCP Inspector HTTP: `bun run inspector:http-server`
- **Maintenance**: `bun run clean` (removes build/), `bun run dxt:pack` (creates DXT package)
- **Versioning**: `bun run bump:patch|minor|major`

## Code Style
- TypeScript with strict type checking
- ESM modules (`import/export`) with `.js` extension in imports
- Use Zod for validation and schema definitions
- Use Axios for API requests
- Class-based services with dependency injection
- Functional controllers with try/catch error handling
- Use error objects with status codes and messages
- Resource-based MCP design using ResourceTemplate where appropriate

## Recent Refactoring Improvements (v2.0.0)

### **Service Layer Refactoring**
The `RaindropService` has been significantly refactored to reduce code duplication and improve maintainability:

#### **Extracted Common Functions:**
- **Response Handlers**: `handleItemResponse<T>()`, `handleItemsResponse<T>()`, `handleCollectionResponse()`, `handleResultResponse()`
- **Endpoint Builders**: `buildTagEndpoint()`, `buildRaindropEndpoint()`
- **Error Handling**: `handleApiError()`, `safeApiCall()` for consistent error management
- **Type Safety**: Enhanced generic typing throughout the service layer

#### **Benefits Achieved:**
- ✅ **25-30% reduction** in service code duplication
- ✅ **Consistent error handling** across all API methods
- ✅ **Improved maintainability** - common patterns centralized
- ✅ **Better type safety** with generic response handlers
- ✅ **Standardized responses** across all service methods
- ✅ **Preserved functionality** - all existing method signatures maintained

#### **Refactored Methods:**
- **Collections (6 methods)**: All CRUD operations now use common response handlers
- **Bookmarks (6 methods)**: Search, create, update operations streamlined
- **Tags (4 methods)**: Unified endpoint building and response handling
- **Highlights (6 methods)**: Consistent error handling with safe API calls
- **File/Reminder Operations**: Standardized response processing

## Conventions
- Imports: Group imports by type (external, internal)
- Naming: camelCase for variables/functions, PascalCase for classes/types
- Error handling: Use try/catch blocks with descriptive error messages
- Type definitions: Prefer interfaces for object types
- Async: Use async/await pattern consistently
- Testing: Use Vitest with mocks for dependencies
- Tests should be co-located with source files in `src/tests` directory

## Project Structure
- **Source code**: `src/` directory with:
  - `index.ts` - STDIO server entry point
  - `cli.ts` - CLI executable entry point  
  - `server.ts` - HTTP server entry point (port 3002)
  - `services/` - Service layer (RaindropService, RaindropMCPService)
  - `types/` - TypeScript type definitions
  - `utils/` - Utilities (logger, etc.)
- **Tests**: `tests/` directory with comprehensive test coverage
- **Build output**: `build/` directory (cli.js, server.js)
- **Configuration**: 
  - `.env` - Environment variables
  - `raindrop.yaml` - OpenAPI specification
  - `smithery.yaml` - Smithery configuration
  - `manifest.json` - DXT manifest
  - `LOGGING_DIAGNOSTICS.md` - Logging documentation

## MCP Resources
- Collections: `collections://all` and `collections://{parentId}/children`
- Tags: `tags://all` and `tags://collection/{collectionId}`
- Highlights: `highlights://all`, `highlights://all?page={pageNumber}&perPage={perPageCount}`, `highlights://raindrop/{raindropId}`, and `highlights://collection/{collectionId}`
- Bookmarks: `bookmarks://collection/{collectionId}` and `bookmarks://raindrop/{id}`
- User info: `user://info`
- User stats: `user://stats`

## MCP Configuration

To use this MCP server with your AI assistant, add the following to your `.mcp.json` file:

```json
{
  "servers": {
    "raindrop": {
      "type": "stdio",
      "command": "npx @adeze/raindrop-mcp",
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

### Alternative Configuration Options

For local development, you can use the following:

```json
{
  "servers": {
    "raindrop": {
      "type": "stdio",
      "command": "cd /path/to/raindrop-mcp && bun start",
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

For HTTP transport instead of stdio:

```json
{
  "servers": {
    "raindrop": {
      "type": "http",
      "url": "http://localhost:3002",
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

### Alternative Installation Methods

#### Smithery Configuration
This project includes a `smithery.yaml` configuration file for [Smithery](https://smithery.ai/), which allows easy discovery and installation of MCP servers.

#### DXT Package
The project can be packaged as a DXT (Developer Extension) for easy distribution:
- Build DXT: `bun run dxt:pack`
- Package includes CLI executable and HTTP server
- Configurable via `manifest.json` with user-friendly API key setup

## MCP Tools Documentation

**Note**: This server uses an optimized tool structure following MCP 2025 best practices. Tools are organized by category with clear, descriptive names and comprehensive parameter documentation.

### 🎯 **Optimized Tool Structure**

The server provides **24 optimized tools** (reduced from 37+ original tools) organized by category for maximum efficiency and AI-friendly interactions:

### **Collection Management (7 tools)**

- `collection_list` - List all collections or child collections of a parent
- `collection_get` - Get detailed information about a specific collection by ID
- `collection_create` - Create a new collection (folder) for organizing bookmarks
- `collection_update` - Update collection properties like title, visibility, or view settings
- `collection_delete` - Delete a collection permanently (WARNING: Cannot be undone)
- `collection_share` - Share a collection with specific users or generate public sharing link
- `collection_maintenance` - Perform maintenance operations (merge, remove empty, empty trash)

### **Bookmark Management (6 tools)**

- `bookmark_search` - Search bookmarks with advanced filtering (primary search tool)
- `bookmark_get` - Get detailed information about a specific bookmark by ID
- `bookmark_create` - Add a new bookmark to a collection with automatic metadata extraction
- `bookmark_update` - Update bookmark properties (title, description, tags, collection)
- `bookmark_batch_operations` - Perform operations on multiple bookmarks at once
- `bookmark_reminders` - Manage reminders for bookmarks (set/remove notifications)

### **Tag Management (2 tools)**

- `tag_list` - List all tags or tags from a specific collection
- `tag_manage` - Perform tag operations (rename, merge, delete, delete multiple)

### **Highlight Management (4 tools)**

- `highlight_list` - List highlights from all bookmarks, specific bookmark, or collection
- `highlight_create` - Create a new text highlight for a bookmark
- `highlight_update` - Update existing highlight's text, note, or color
- `highlight_delete` - Delete a highlight permanently (cannot be undone)

### **User & Account Management (2 tools)**

- `user_profile` - Get user account information (name, email, subscription status)
- `user_statistics` - Get account statistics or collection-specific statistics

### **Import/Export (3 tools)**

- `import_status` - Check the status of ongoing import operations
- `export_bookmarks` - Export bookmarks in various formats (CSV, HTML, PDF)
- `export_status` - Check export operation status and get download link

### **System & Diagnostics (2 tools)**

- `diagnostics` - Get MCP server diagnostic information
- `prompts/list` - List available prompts for the Raindrop MCP extension

### **Dynamic Tools (2 tools)**

- `feature_availability` - Check which Raindrop.io features are available for your account
- `quick_actions` - Get suggested quick actions based on recent activity and data state

---

## 📊 **Optimization Benefits**

- **35% reduction** in tool count (37+ → 24 tools)
- **Hierarchical naming** with category_action pattern for better organization
- **Enhanced descriptions** with comprehensive use cases and parameter documentation
- **Better discoverability** through logical tool grouping and consistent naming
- **AI-friendly interface** with detailed parameter descriptions and examples
- **Improved maintainability** with reduced code duplication in service layer
- **Preserved functionality** - all original features available through optimized tools

## 🔧 **Key Improvements**

### **Tool Organization:**
- **Clear naming conventions**: `category_action` pattern (e.g., `bookmark_search`, `collection_create`)
- **Comprehensive descriptions**: Each tool includes detailed use cases and parameter explanations
- **Logical grouping**: Tools organized by functional area for easier discovery
- **Dynamic tools**: Context-aware tools that provide smart recommendations

### **Service Layer:**
- **25-30% code reduction** through extracted common functions
- **Consistent error handling** with standardized response patterns
- **Type safety improvements** with generic response handlers
- **Centralized endpoint building** for API consistency

### **Developer Experience:**
- **Rich parameter documentation** with examples and constraints
- **Enhanced error messages** with actionable suggestions
- **Standardized resource URI patterns** (raindrop://type/scope)
- **Comprehensive diagnostic tools** for debugging and monitoring

## Additional Features

### Logging and Diagnostics
- **STDIO-safe logging**: Uses stderr to avoid protocol pollution
- **Structured logging**: Timestamp, log levels, context-aware
- **Built-in diagnostics tool**: Get server status, memory usage, capabilities
- **Environment-based configuration**: `LOG_LEVEL=debug` for verbose output
- **Transport awareness**: Consistent logging across STDIO and HTTP modes
- See `LOGGING_DIAGNOSTICS.md` for detailed information

### Dual Entry Points
- **CLI executable** (`src/cli.ts`): For direct command-line usage
- **HTTP server** (`src/server.ts`): For web-based MCP protocol (port 3002)
- **STDIO server** (`src/index.ts`): Standard MCP protocol over stdin/stdout

### Version Information
- **Current version**: 2.0.5
- **Node.js**: >=18.0.0 required
- **Bun**: >=1.0.0 required
- **MCP SDK**: ^1.17.1
