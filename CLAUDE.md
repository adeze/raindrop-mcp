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
      "url": "http://localhost:3000",
      "env": {
        "RAINDROP_ACCESS_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

### Smithery Configuration

This project includes a `smithery.yaml` configuration file for [Smithery](https://smithery.ai/), which allows easy discovery and installation of MCP servers. The configuration specifies how to start the MCP server and requires no additional configuration options.

## MCP Tools Documentation

**Note**: This server uses an optimized, consolidated tool structure following MCP 2025 best practices. Tools are organized by operation type with unified interfaces.

### 🎯 **Consolidated Tool Structure**

The server provides **10 consolidated tools** (reduced from 37+ individual tools) for maximum efficiency and clarity:

### **Collection Management**

#### `collection_manage`
- **Description**: Comprehensive collection management for all CRUD operations
- **Parameters**:
  - `operation` (enum): Operation to perform - 'list', 'get', 'create', 'update', 'delete'
  - `parentId` (number, optional): Parent collection ID for listing children
  - `id` (number, optional): Collection ID (required for get/update/delete)
  - `title` (string, optional): Collection title (required for create)
  - `isPublic` (boolean, optional): Make collection public
  - `view` (enum, optional): View type - 'list', 'simple', 'grid', 'masonry'
  - `sort` (enum, optional): Sort order - 'title', '-created'
- **Examples**:
  - List all: `{"operation": "list"}`
  - Get specific: `{"operation": "get", "id": 123}`
  - Create new: `{"operation": "create", "title": "My Collection"}`

#### `collection_advanced`
- **Description**: Advanced collection operations including sharing and maintenance
- **Parameters**:
  - `operation` (enum): Operation to perform - 'share', 'merge', 'remove_empty', 'empty_trash'
  - `id` (number, optional): Collection ID (required for share)
  - `level` (enum, optional): Access level - 'view', 'edit', 'remove'
  - `emails` (string[], optional): Email addresses to share with
  - `targetId` (number, optional): Target collection ID (for merge)
  - `sourceIds` (number[], optional): Source collection IDs (for merge)
- **Examples**:
  - Share collection: `{"operation": "share", "id": 123, "level": "view"}`
  - Merge collections: `{"operation": "merge", "targetId": 123, "sourceIds": [456, 789]}`

### **Bookmark Management**

#### `bookmark_manage`
- **Description**: Comprehensive bookmark management for core CRUD operations and search
- **Parameters**:
  - `operation` (enum): Operation to perform - 'search', 'get', 'create', 'update'
  - `query` (string, optional): Search query for text search
  - `collection` (number, optional): Collection ID filter
  - `tags` (string[], optional): Filter by tags
  - `createdStart` (string, optional): Created after date (ISO format)
  - `createdEnd` (string, optional): Created before date (ISO format)
  - `important` (boolean, optional): Important/starred filter or setting
  - `media` (enum, optional): Media type - 'image', 'video', 'document', 'audio'
  - `page` (number, optional): Page number for pagination (default: 0)
  - `perPage` (number, optional): Results per page (max 50, default: 25)
  - `sort` (enum, optional): Sort order with prefixes
  - `id` (number, optional): Bookmark ID (required for get/update)
  - `url` (string, optional): URL to bookmark (required for create)
  - `collectionId` (number, optional): Target collection ID
  - `title` (string, optional): Bookmark title
  - `description` (string, optional): Bookmark description
- **Examples**:
  - Search: `{"operation": "search", "query": "javascript", "tags": ["tutorial"]}`
  - Get bookmark: `{"operation": "get", "id": 12345}`
  - Create bookmark: `{"operation": "create", "url": "https://example.com", "collectionId": 123}`

#### `bookmark_batch`
- **Description**: Perform operations on multiple bookmarks including batch updates, tagging, and reminders
- **Parameters**:
  - `operation` (enum): Operation - 'update', 'move', 'tag_add', 'tag_remove', 'delete', 'delete_permanent', 'set_reminder', 'remove_reminder'
  - `bookmarkIds` (number[]): List of bookmark IDs to operate on
  - `collectionId` (number, optional): Target collection ID
  - `important` (boolean, optional): Set important status
  - `tags` (string[], optional): Tags to add/remove
  - `date` (string, optional): Reminder date (ISO format)
  - `note` (string, optional): Reminder note
- **Examples**:
  - Batch tag: `{"operation": "tag_add", "bookmarkIds": [1,2,3], "tags": ["work"]}`
  - Set reminder: `{"operation": "set_reminder", "bookmarkIds": [123], "date": "2025-08-01T10:00:00Z"}`

### **Tag Management**

#### `tag_operations`
- **Description**: Comprehensive tag management for all tag operations including listing, renaming, merging, and deleting
- **Parameters**:
  - `operation` (enum): Operation to perform - 'list', 'rename', 'merge', 'delete', 'delete_multiple'
  - `collectionId` (number, optional): Collection ID to scope operation
  - `oldName` (string, optional): Current tag name (required for rename)
  - `newName` (string, optional): New tag name (required for rename)
  - `sourceTags` (string[], optional): Tags to merge from (required for merge)
  - `destinationTag` (string, optional): Tag to merge into (required for merge)
  - `tagName` (string, optional): Tag to delete (required for single delete)
  - `tagNames` (string[], optional): Tags to delete (required for multiple delete)
- **Examples**:
  - List tags: `{"operation": "list", "collectionId": 123}`
  - Rename tag: `{"operation": "rename", "oldName": "js", "newName": "javascript"}`
  - Merge tags: `{"operation": "merge", "sourceTags": ["js", "JS"], "destinationTag": "javascript"}`

### **Highlight Management**

#### `highlight_manage`
- **Description**: Comprehensive highlight management for all CRUD operations on text highlights
- **Parameters**:
  - `operation` (enum): Operation to perform - 'list', 'create', 'update', 'delete'
  - `scope` (enum, optional): Scope for listing - 'all', 'bookmark', 'collection' (default: 'all')
  - `bookmarkId` (number, optional): Bookmark ID (required for bookmark scope and create)
  - `collectionId` (number, optional): Collection ID (required for collection scope)
  - `page` (number, optional): Page number for pagination (default: 0)
  - `perPage` (number, optional): Results per page (max 50, default: 25)
  - `id` (number, optional): Highlight ID (required for update and delete)
  - `text` (string, optional): Highlight text (required for create)
  - `note` (string, optional): Highlight note
  - `color` (string, optional): Highlight color
- **Examples**:
  - List all highlights: `{"operation": "list", "scope": "all"}`
  - Create highlight: `{"operation": "create", "bookmarkId": 123, "text": "Important text"}`
  - Update highlight: `{"operation": "update", "id": 456, "note": "Updated note"}`

### **User & Account Management**

#### `user_account`
- **Description**: Comprehensive user account management for profile information and statistics
- **Parameters**:
  - `operation` (enum): Operation to perform - 'profile', 'statistics'
  - `collectionId` (number, optional): Collection ID for specific statistics (only for statistics operation)
- **Examples**:
  - Get profile: `{"operation": "profile"}`
  - Get stats: `{"operation": "statistics", "collectionId": 123}`

### **System & Diagnostics**

#### `system_info`
- **Description**: Get system information including server diagnostics and available prompts
- **Parameters**:
  - `type` (enum): Type of system information - 'diagnostics', 'prompts'
- **Examples**:
  - Get diagnostics: `{"type": "diagnostics"}`
  - List prompts: `{"type": "prompts"}`

### **Data Import & Export**

#### `data_import`
- **Description**: Manage data import operations and monitor import progress
- **Parameters**: None
- **Examples**:
  - Check import status: `{}`

#### `data_export`
- **Description**: Comprehensive data export management for backup and migration
- **Parameters**:
  - `operation` (enum): Operation to perform - 'start', 'status'
  - `format` (enum, optional): Export format - 'csv', 'html', 'pdf' (required for start)
  - `collectionId` (number, optional): Export specific collection only
  - `includeBroken` (boolean, optional): Include broken/dead links (default: false)
  - `includeDuplicates` (boolean, optional): Include duplicate bookmarks (default: false)
- **Examples**:
  - Start export: `{"operation": "start", "format": "csv", "collectionId": 123}`
  - Check status: `{"operation": "status"}`

---

## 📊 **Consolidation Benefits**

- **77% reduction** in tool count (37 → 10 tools)
- **Unified interfaces** with consistent operation-based routing
- **Better discoverability** through logical tool grouping  
- **Enhanced AI compatibility** with clear operation semantics
- **Improved maintainability** with reduced code duplication
- **Preserved functionality** - all original features available through consolidated tools

## 🔧 **Migration from Legacy Tools**

The server maintains backward compatibility while encouraging migration to consolidated tools:

| Legacy Tool | New Consolidated Tool | Operation |
|-------------|----------------------|-----------|
| `getCollections` | `collection_manage` | `{"operation": "list"}` |
| `createBookmark` | `bookmark_manage` | `{"operation": "create", ...}` |  
| `getTags` | `tag_operations` | `{"operation": "list"}` |
| `getAllHighlights` | `highlight_manage` | `{"operation": "list", "scope": "all"}` |
| `getUserInfo` | `user_account` | `{"operation": "profile"}` |
