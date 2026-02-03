# CLAUDE.md - Raindrop MCP Project Guidelines

## Project Overview

**Raindrop MCP** is a Model Context Protocol (MCP) server that provides AI assistants with access to Raindrop.io bookmark management functionality. It implements dynamic resource handling, real-time API integration, and comprehensive tool support.

### Version Information

- **Current version**: 2.3.0
- **Node.js**: >=18.0.0 required
- **Bun**: >=1.0.0 required
- **MCP SDK**: ^1.25.3

### Key Features

- ✅ **Full MCP Protocol Compliance**: Implements MCP SDK v1.25.3 with proper tool/resource registration
- ✅ **Dynamic Resource System**: Access any collection or bookmark by ID without pre-registration
- ✅ **Real-time API Data**: Resources fetch live data from Raindrop.io APIs on-demand
- ✅ **Comprehensive Testing**: 45 tests with real API validation
- ✅ **Type Safety**: Full TypeScript implementation with Zod validation schemas

## External References

### Core Documentation

- [Raindrop.io API Documentation](https://developer.raindrop.io)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Model Context Protocol with LLMs](https://modelcontextprotocol.io/llms-full.txt)
- [MCP Typescript SDK v1.25.3](https://github.com/modelcontextprotocol/typescript-sdk)

### Development Resources

- [Example MCP servers repository](https://github.com/modelcontextprotocol/servers)
- [MCP Boilerplate](https://github.com/cyanheads/mcp-ts-template)
- [MCP Inspector Tool](https://github.com/modelcontextprotocol/inspector)
- [This project on GitHub](https://github.com/adeze/raindrop-mcp)
- [systemprompt-mcp-server](https://github.com/systempromptio/systemprompt-mcp-server)

## Installation and Usage

### NPM Package

```bash
npx @adeze/raindrop-mcp@latest
```

### Development Commands

- **Development**: `bun run dev` (watch STDIO mode) or `bun run dev:http` (watch HTTP mode)
- **Production**: `bun run start:prod` (from build) or `bun run run` (CLI executable)
- **HTTP Server**: `bun run start:http` (starts HTTP transport on port 3002)
- **Type checking**: `bun run type-check`
- **Testing**: `bun run test`, `bun run test:coverage`, `bun run test:e2e`
- **Building**: `bun run build` (creates build/ directory with index.js and server.js)
- **Debugging**:
  - MCP Inspector STDIO: `bun run inspector`
  - MCP Inspector HTTP: `bun run inspector:http-server`
- **Maintenance**: `bun run clean` (removes build/), `bun run mcpb:pack` (creates MCPB bundle)
- **Versioning**: `bun run bump:patch|minor|major`

### MCP Configuration

Add to your `.mcp.json` file:

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

#### Alternative Configurations

**Local Development:**

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

**HTTP Transport:**

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

#### Alternative Installation Methods

**Smithery Configuration**: This project includes a `smithery.yaml` configuration file for [Smithery](https://smithery.ai/), which allows easy discovery and installation of MCP servers.

**MCPB Bundle**: The project is packaged as an MCP Bundle (MCPB) for distribution:

- Build MCPB: `bun run mcpb:pack`
- Bundle includes CLI executable and HTTP server
- Configurable via `manifest.json` with user-friendly API key setup

## Architecture

### Project Structure

```
src/
├── index.ts                    # STDIO server entry point
├── server.ts                   # HTTP server entry point (port 3002)
├── services/
│   ├── raindrop.service.ts     # Core Raindrop.io API client
│   └── raindropmcp.service.ts  # MCP protocol wrapper
├── types/                      # TypeScript type definitions and Zod schemas
└── utils/                      # Utilities (logger, etc.)

tests/
├── mcp.service.test.ts         # MCP integration tests with real API calls
└── raindrop.service.test.ts    # Core service layer tests

build/                          # Build output (index.js, server.js)
```

### Service Architecture

#### **RaindropMCPService** (MCP Protocol Layer)

The main MCP server implementation that wraps the MCP SDK:

**Resource Management:**

- **Dynamic Resource System**: Resources created on-demand without pre-registration
- **Supported Resource URIs**:
  - `mcp://user/profile` - User account information (real-time API data)
  - `diagnostics://server` - Server diagnostics and environment info
  - `mcp://collection/{id}` - Any collection data (real-time API data)
  - `mcp://raindrop/{id}` - Any bookmark data (real-time API data)

**Tool Management:**

- **Declarative Configuration**: Tools defined using `ToolConfig` interfaces with Zod schemas
- **Currently Registered**: 10 active tools covering diagnostics, collections, bookmarks, tags, and highlights
- **Dynamic Discovery**: `listTools()` method returns all available tools with metadata

**Public API Methods:**

- `readResource(uri: string)` - Reads resources with real API data fetching
- `listTools()` - Returns all available tools with schemas
- `listResources()` - Returns all registered resources and patterns
- `callTool(toolId: string, input: any)` - Executes tools by ID
- `getManifest()` - Returns MCP server manifest
- `healthCheck()` - Server health status
- `getInfo()` - Basic server information

#### **RaindropService** (API Client Layer)

Optimized Raindrop.io API client with 25-30% code reduction through:

**Common Functions Extracted:**

- **Response Handlers**: `handleItemResponse<T>()`, `handleItemsResponse<T>()`, `handleCollectionResponse()`, `handleResultResponse()`
- **Endpoint Builders**: `buildTagEndpoint()`, `buildRaindropEndpoint()`
- **Error Management**: `handleApiError()`, `safeApiCall()` for consistent error handling
- **Type Safety**: Enhanced generic typing throughout the service layer

**Refactored Methods:**

- **Collections (6 methods)**: All CRUD operations use common response handlers
- **Bookmarks (6 methods)**: Search, create, update operations streamlined
- **Tags (4 methods)**: Unified endpoint building and response handling
- **Highlights (6 methods)**: Consistent error handling with safe API calls
- **File/Reminder Operations**: Standardized response processing

### Entry Points

- **STDIO server** (`src/index.ts`): Standard MCP protocol over stdin/stdout
- **HTTP server** (`src/server.ts`): Web-based MCP protocol (port 3002)

## Tools and Resources

### Currently Registered Tools (10 tools)

#### **System & Diagnostics (1 tool)**

- `diagnostics` - Get MCP server diagnostic information with environment details

#### **Collection Management (2 tools)**

- `collection_list` - List all collections for the authenticated user (returns `resource` content)
- `collection_manage` - Create, update, or delete collections with operation parameter

#### **Bookmark Management (2 tools)**

- `bookmark_search` - Search bookmarks with advanced filtering (returns `resource` content)
- `bookmark_manage` - Create, update, or delete bookmarks with operation parameter

#### **Tag Management (1 tool)**

- `tag_manage` - Rename, merge, or delete tags with operation parameter

#### **Highlight Management (1 tool)**

- `highlight_manage` - Create, update, or delete highlights with operation parameter

#### **Legacy Tools (2 tools)**

- `getRaindrop` - Fetch a single bookmark by ID (placeholder implementation)
- `listRaindrops` - List bookmarks for a collection (placeholder implementation)

### Resource System

**Static Resources:**

- `mcp://user/profile` - User account information
- `diagnostics://server` - Server diagnostics and environment info

**Dynamic Resource Patterns:**

- `mcp://collection/{id}` - Access any Raindrop collection by ID (e.g., `mcp://collection/123456`)
- `mcp://raindrop/{id}` - Access any Raindrop bookmark by ID (e.g., `mcp://raindrop/987654`)

**Key Benefits:**

- No pre-registration required for collections/bookmarks
- Real-time API data fetching
- Graceful error handling for non-existent resources
- Scalable to any valid Raindrop.io ID

## Testing

### Test Structure

#### **`tests/mcp.service.test.ts`** - MCP Integration Tests

- **Purpose**: Full MCP service integration with real Raindrop.io API calls
- **Coverage**: 11 test cases covering all public MCP service methods
- **Key Test Areas**:
  - ✅ Server initialization and cleanup
  - ✅ Dynamic resource reading with real API data
  - ✅ Tool listing and metadata validation (9 registered tools)
  - ✅ Resource listing and registration (4+ resource types)
  - ✅ Diagnostics and health checks
  - ✅ MCP manifest generation
  - ✅ API inspection test for debugging

#### **`tests/raindrop.service.test.ts`** - Core Service Tests

- **Purpose**: Core Raindrop.io API client functionality
- **Coverage**: Service layer methods with mocked dependencies
- **Focus**: API client optimization and common function extraction

### Test Configuration

- **Framework**: Vitest with TypeScript support
- **Environment**: Requires `RAINDROP_ACCESS_TOKEN` in `.env` file
- **Execution**: `bun run test` or `bun run test:coverage`
- **Real API Testing**: Tests use actual Raindrop.io API endpoints
- **Dynamic Testing**: Validates system works with any valid collection/bookmark ID

### Test Data Validation

Current tests validate against real API responses:

- **User Profile**: Real user account data (Pro account features)
- **Collections**: Various collections with different properties
- **Bookmarks**: Real bookmark data with metadata, tags, and highlights
- **Diagnostics**: Server status, version info, timestamp

## Development Guidelines

### MCP Server Design Patterns

- **Protocol Compliance**: Follow MCP specification strictly. Reference [MCP docs](https://modelcontextprotocol.io/)
- **Transport Abstraction**: Use interfaces and dependency injection for HTTP, STDIO, or custom transports
- **Service Layer**: Encapsulate business logic in stateless, testable service classes
- **Schema Validation**: Use `zod` for all input/output validation at transport boundary
- **Error Handling**: Centralized error handling with MCP-compliant error objects
- **Manifest & Tooling**: Expose manifest for host integration with all operations and schemas
- **Extensibility**: Registry/factory patterns for easy tool addition
- **Async/Await**: All operations must be async
- **Type Safety**: TypeScript interfaces for all protocol objects

### Tool Implementation Patterns

- **Tool Registration**: Central registry with factory pattern for tool handlers
- **Tool Handler Structure**: Clear async methods with validated input/structured output
- **Schema-Driven**: Define input/output schemas with `zod` validation
- **Error Propagation**: MCP-compliant error objects from tool handlers
- **Resource Access**: Dedicated service classes with dependency injection
- **Declarative Manifest**: All tools/resources declared with schemas and metadata
- **Isolation**: Stateless tools with context objects for per-request data
- **Extensibility**: Easy addition through handler implementation and manifest updates

### Code Style and Conventions

- **Language**: TypeScript with strict type checking
- **Modules**: ESM modules (`import/export`) with `.js` extension in imports
- **Validation**: Zod for all schema definitions and validation
- **API Client**: `openapi-fetch` for REST API access
- **Architecture**: Class-based services with dependency injection
- **Error Handling**: Try/catch blocks with descriptive error messages
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Types**: Prefer interfaces for object types
- **Async**: Consistent async/await pattern
- **Testing**: Vitest with mocks for dependencies in `tests/` directory
- **Imports**: Group by type (external, internal)

### Configuration Files

- `.env` - Environment variables (API tokens)
- `raindrop.yaml` - OpenAPI specification
- `smithery.yaml` - Smithery configuration
- `manifest.json` - MCPB manifest
- `LOGGING_DIAGNOSTICS.md` - Logging documentation

### Future Tool Expansion

The current architecture supports easy expansion to the full 24+ tool suite including:

- User profile and statistics tools
- Import/export functionality
- Advanced bookmark batch operations
- Reminder management
- Feature availability checking
- Quick action suggestions
