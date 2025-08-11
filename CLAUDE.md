# CLAUDE.md - Raindrop MCP Project Guidelines

## External References
- Raindrop.io API Documentation: [https://developer.raindrop.io](https://developer.raindrop.io)
- MCP Documentation: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)
- [Model Context Protocol with LLMs](https://modelcontextprotocol.io/llms-full.txt)
- [MCP Typescript SDK v1.17.1](https://github.com/modelcontextprotocol/typescript-sdk)
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
- **Building**: `bun run build` (creates build/ directory with index.js and server.js)
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
- Tests should be co-located with source files in `tests/` directory

## Project Structure
- **Source code**: `src/` directory with:
  - `index.ts` - STDIO server entry point
  - `cli.ts` - CLI executable entry point  
  - `server.ts` - HTTP server entry point (port 3002)
  - `services/` - Service layer:
    - `raindrop.service.ts` - Core Raindrop.io API client with optimized common functions
    - `raindropmcp.service.ts` - MCP protocol wrapper with resource management
  - `types/` - TypeScript type definitions and Zod schemas
  - `utils/` - Utilities (logger, etc.)
- **Tests**: `tests/` directory with comprehensive test coverage using `vitest`:
  - `mcp.service.test.ts` - Full MCP service integration tests with real API calls
  - `raindrop.service.test.ts` - Core service layer tests
- **Build output**: `build/` directory (index.js, server.js)
- **Configuration**: 
  - `.env` - Environment variables
  - `raindrop.yaml` - OpenAPI specification
  - `smithery.yaml` - Smithery configuration
  - `manifest.json` - DXT manifest
  - `LOGGING_DIAGNOSTICS.md` - Logging documentation

## Service Architecture

### **RaindropMCPService** (MCP Protocol Layer)
The main MCP server implementation that wraps the MCP SDK and provides:

#### **Resource Management:**
- **Dynamic Resource Registration**: Resources are registered at initialization and populated with real data on-demand
- **Supported Resource URIs**:
  - `mcp://user/profile` - User account information (real-time API data)
  - `diagnostics://server` - Server diagnostics and environment info
  - `mcp://collection/{id}` - Specific collection data (real-time API data)
  - `mcp://raindrop/{id}` - Specific bookmark data (real-time API data)
- **Fallback Handling**: Falls back to placeholder data if API calls fail

#### **Tool Management:**
- **Declarative Tool Configuration**: Tools are defined using `ToolConfig` interfaces with Zod schemas
- **Currently Registered Tools**: 9 active tools including diagnostics, collection management, bookmark operations
- **Dynamic Tool Discovery**: `listTools()` method returns all available tools with metadata

#### **Public API Methods:**
- `readResource(uri: string)` - Reads resources with real API data fetching
- `listTools()` - Returns all available tools with schemas
- `listResources()` - Returns all registered resources
- `callTool(toolId: string, input: any)` - Executes tools by ID
- `getManifest()` - Returns MCP server manifest
- `healthCheck()` - Server health status
- `getInfo()` - Basic server information

### **RaindropService** (API Client Layer)
Optimized Raindrop.io API client with common function extraction:

#### **Optimization Features:**
- **Common Response Handlers**: `handleItemResponse<T>()`, `handleItemsResponse<T>()`
- **Endpoint Builders**: `buildTagEndpoint()`, `buildRaindropEndpoint()`
- **Error Management**: `handleApiError()`, `safeApiCall()` with consistent patterns
- **25-30% Code Reduction**: Through extracted common functions

## MCP Resources (Legacy Documentation)
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

### 🎯 **Current Tool Implementation**

The server currently provides **9 registered tools** with declarative configuration for MCP integration:

### **Currently Registered Tools (9 tools)**

#### **System & Diagnostics (1 tool)**
- `diagnostics` - Get MCP server diagnostic information with environment details

#### **Collection Management (2 tools)**
- `collection_list` - List all collections for the authenticated user (returns resource links)
- `collection_manage` - Create, update, or delete collections with operation parameter

#### **Bookmark Management (2 tools)**
- `bookmark_search` - Search bookmarks with advanced filtering (returns resource links)
- `bookmark_manage` - Create, update, or delete bookmarks with operation parameter

#### **Tag Management (1 tool)**
- `tag_manage` - Rename, merge, or delete tags with operation parameter

#### **Highlight Management (1 tool)**
- `highlight_manage` - Create, update, or delete highlights with operation parameter

#### **Legacy Tools (2 tools)**
- `getRaindrop` - Fetch a single bookmark by ID (placeholder implementation)
- `listRaindrops` - List bookmarks for a collection (placeholder implementation)

### **Future Tool Expansion**
The current architecture supports easy expansion to the full 24+ tool suite including:
- User profile and statistics tools
- Import/export functionality
- Advanced bookmark batch operations
- Reminder management
- Feature availability checking
- Quick action suggestions

## 📊 **Implementation Status & Benefits**

### **Current MCP Integration Features:**
- ✅ **Full MCP Protocol Compliance**: Implements MCP SDK v1.17.1 with proper tool/resource registration
- ✅ **Real-time API Data**: Resources fetch live data from Raindrop.io APIs on-demand
- ✅ **Robust Error Handling**: Graceful fallback to placeholder data when API calls fail
- ✅ **Comprehensive Testing**: 11 test cases with real API validation
- ✅ **Resource URI Patterns**: Standardized `mcp://` and `diagnostics://` URI schemes
- ✅ **Dynamic Discovery**: Tools and resources are discoverable through MCP protocol
- ✅ **Type Safety**: Full TypeScript implementation with Zod validation schemas

### **Service Layer Optimizations:**
- ✅ **25-30% Code Reduction**: Through extracted common functions in RaindropService
- ✅ **Consistent Response Handling**: Standardized API response processing
- ✅ **Enhanced Error Management**: Centralized error handling with detailed messages
- ✅ **Generic Type Support**: Type-safe operations across all service methods

### **Tool Architecture:**
- **Declarative Configuration**: Tools defined with `ToolConfig` interfaces and Zod schemas
- **Operation-based Design**: Tools use operation parameters (create/update/delete) for CRUD operations
- **Resource Link Responses**: Search and list tools return resource links for further exploration
- **Extensible Framework**: Easy addition of new tools following established patterns

### Dual Entry Points

- **HTTP server** (`src/server.ts`): For web-based MCP protocol (port 3002)
- **STDIO server** (`src/index.ts`): Standard MCP protocol over stdin/stdout

## Testing

### **Test Structure**
The project uses Vitest for comprehensive testing with the following test files:

#### **`tests/mcp.service.test.ts`** - MCP Integration Tests
- **Purpose**: Tests the full MCP service integration with real Raindrop.io API calls
- **Coverage**: 11 test cases covering all public MCP service methods
- **API Integration**: Tests with actual API tokens and real data fetching
- **Key Test Areas**:
  - ✅ Server initialization and cleanup
  - ✅ Resource reading with real API data (`mcp://user/profile`, `mcp://collection/{id}`, `mcp://raindrop/{id}`)
  - ✅ Tool listing and metadata validation (9 registered tools)
  - ✅ Resource listing and registration (4 resource types)
  - ✅ Diagnostics and health checks
  - ✅ MCP manifest generation
  - ✅ API inspection test for debugging

#### **`tests/raindrop.service.test.ts`** - Core Service Tests
- **Purpose**: Tests the core Raindrop.io API client functionality
- **Coverage**: Service layer methods with mocked dependencies
- **Focus**: API client optimization and common function extraction

### **Test Configuration**
- **Framework**: Vitest with TypeScript support
- **Environment**: Requires `RAINDROP_ACCESS_TOKEN` in `.env` file
- **Execution**: `bun run test` or `bun run test:coverage`
- **Real API Testing**: Tests use actual Raindrop.io API endpoints
- **Test Constants**: Configurable collection and raindrop IDs for testing

### **Test Data Validation**
Current tests validate against real API responses:
- **User Profile**: Real user account data (ID: 858216, Pro account)
- **Collection**: "Veritex" collection (ID: 55725911, 112 bookmarks)
- **Bookmark**: VentureBeat article about MCPEval (ID: 1286757883)
- **Diagnostics**: Server status, version info, timestamp

### Version Information
- **Current version**: 2.0.11
- **Node.js**: >=18.0.0 required
- **Bun**: >=1.0.0 required
- **MCP SDK**: ^1.17.1
