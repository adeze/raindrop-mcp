# MCP Output Schema Documentation

This document describes the comprehensive output validation and schema system implemented for the Raindrop MCP server.

## Overview

All MCP tools now include:
- **Zod-based output validation** - Ensures consistent response structure
- **Schema documentation** - Exposed in tool metadata for introspection
- **Streaming support** - For tools that provide progressive output
- **Type safety** - Full TypeScript support with inferred types

## Schema Categories

### Collection Schemas
- `CollectionResponseSchema` - Single collection responses
- `CollectionListResponseSchema` - Multiple collection responses

**Example Response:**
```json
{
  "content": [{
    "type": "text",
    "text": "My Collection",
    "metadata": {
      "id": 12345,
      "title": "My Collection", 
      "count": 25,
      "public": false,
      "created": "2024-01-01T00:00:00Z",
      "lastUpdate": "2024-01-02T00:00:00Z",
      "category": "collection"
    }
  }]
}
```

### Bookmark Schemas
- `BookmarkResponseSchema` - Single bookmark responses  
- `BookmarkListResponseSchema` - Multiple bookmark responses

**Supports both text and resource content types:**

Text format:
```json
{
  "content": [{
    "type": "text",
    "text": "Bookmark Title",
    "metadata": {
      "id": 54321,
      "title": "Bookmark Title",
      "link": "https://example.com",
      "tags": ["tag1", "tag2"],
      "category": "bookmark"
    }
  }]
}
```

Resource format (for search results):
```json
{
  "content": [{
    "type": "resource",
    "resource": {
      "text": "Bookmark Title",
      "uri": "https://example.com", 
      "metadata": {
        "id": 54321,
        "title": "Bookmark Title",
        "link": "https://example.com",
        "tags": ["tag1", "tag2"],
        "category": "bookmark"
      }
    }
  }]
}
```

### Tag Schemas
- `TagResponseSchema` - Tag-related responses

### Highlight Schemas  
- `HighlightResponseSchema` - Text highlight responses

### User & Stats Schemas
- `UserResponseSchema` - User profile responses
- `StatsResponseSchema` - Statistics responses

### Import/Export Schemas
- `ImportExportResponseSchema` - Import/export status responses

### Operation Result Schemas
- `OperationResultResponseSchema` - Success/failure operation responses

## Streaming Output Support

For tools that support streaming output, the following schema is used:

### StreamingResponseSchema

**Individual Chunks:**
```json
{
  "type": "text",
  "text": "Partial content...",
  "metadata": {
    "chunkIndex": 0,
    "isComplete": false,
    "totalChunks": 5
  }
}
```

**Complete Streaming Response:**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "First chunk...",
      "metadata": {
        "chunkIndex": 0,
        "isComplete": false,
        "totalChunks": 3
      }
    },
    {
      "type": "text",
      "text": "Final chunk...", 
      "metadata": {
        "chunkIndex": 2,
        "isComplete": true,
        "totalChunks": 3
      }
    }
  ],
  "metadata": {
    "streaming": true,
    "totalChunks": 3
  }
}
```

### Streaming-Enabled Tools

Currently, the following tools support streaming output:
- Large bookmark search results
- Bulk export operations  
- Import status monitoring

To enable streaming for a tool, use:
```typescript
createToolMetadata(ResponseSchema, 'category', true) // true enables streaming
```

## Tool Metadata

Every tool now includes comprehensive metadata:

```json
{
  "category": "bookmarks",
  "outputSchema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "content": { "type": "array" },
      "metadata": { "type": "object" }
    }
  },
  "hasValidation": true,
  "streaming": {
    "supported": true,
    "chunkSchema": { /* chunk schema definition */ }
  }
}
```

## Implementation Details

### Validation Functions

- `validateToolOutput(output, schema)` - Validates tool output against schema
- `createValidatedToolHandler(handler, schema)` - Wraps tool handlers with validation
- `createToolResponse(content, metadata, schema)` - Creates validated responses
- `createToolMetadata(schema, category, streaming)` - Generates tool metadata

### Usage Example

```typescript
this.server.tool(
  'getBookmarks',
  'Get bookmarks with validation',
  { /* input schema */ },
  createValidatedToolHandler(async (params) => {
    const bookmarks = await service.getBookmarks(params);
    return createToolResponse(
      bookmarks.map(b => ({
        type: "text",
        text: b.title,
        metadata: { /* bookmark metadata */ }
      })),
      { total: bookmarks.length },
      BookmarkListResponseSchema
    );
  }, BookmarkListResponseSchema),
  createToolMetadata(BookmarkListResponseSchema, 'bookmarks')
);
```

## Benefits

1. **Type Safety** - Full TypeScript support with compile-time validation
2. **Runtime Validation** - Ensures all tool outputs match expected schemas  
3. **Documentation** - Schema information exposed for API introspection
4. **Consistency** - Standardized response format across all tools
5. **Streaming** - Proper support for progressive/chunked responses
6. **Error Handling** - Clear validation error messages
7. **Future Proofing** - Easy schema evolution and versioning

## Testing

All schemas include comprehensive test coverage:
```bash
bun test tests/output-schema.test.ts
```

Tests validate:
- Schema validation for all response types
- Both text and resource content formats
- Streaming response schemas
- Error handling for invalid outputs
- Metadata generation