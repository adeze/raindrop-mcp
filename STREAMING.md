# Streaming/Chunked Tool Results

This document describes the streaming and chunked tool results implementation for the Raindrop MCP server.

## Overview

The Raindrop MCP server now supports streaming/chunked results for large datasets and long-running operations. This feature provides:

- **Real-time progress updates** via MCP progress notifications
- **Chunked data processing** for large result sets  
- **Better user experience** for long-running operations
- **Graceful error handling** during streaming operations

## Supported Tools

### 1. `bookmark_search` (Streaming Search Results)

**Parameter**: `streamResults: boolean` (default: `false`)

Enables chunked search results with progress tracking. When enabled, search results are fetched in smaller chunks with progress notifications sent for each chunk processed.

```json
{
  "tool": "bookmark_search",
  "arguments": {
    "query": "javascript tutorials",
    "streamResults": true,
    "perPage": 50
  }
}
```

**Progress Updates**:
- Initial: "Starting bookmark search..."
- During: "Processed X of Y bookmarks..."
- Final: "Completed! Processed X bookmarks."

### 2. `highlight_list` (Streaming Highlights)

**Parameter**: `streamResults: boolean` (default: `false`)

Supports chunked highlight retrieval with progress tracking. Only available for `scope: "all"`.

```json
{
  "tool": "highlight_list", 
  "arguments": {
    "scope": "all",
    "streamResults": true,
    "perPage": 25
  }
}
```

**Progress Updates**:
- Initial: "Starting highlights retrieval..."
- During: "Processed X highlights..."
- Final: "Completed! Retrieved X highlights."

### 3. `bookmark_batch_operations` (Progress Tracking)

**Parameter**: `enableProgress: boolean` (default: `false`)

Enables progress notifications for batch operations on multiple bookmarks. Automatically enabled for operations on >5 bookmarks.

```json
{
  "tool": "bookmark_batch_operations",
  "arguments": {
    "operation": "tag_add",
    "bookmarkIds": [1, 2, 3, 4, 5, 6],
    "tags": ["important"],
    "enableProgress": true
  }
}
```

**Progress Updates**:
- Initial: "Starting batch [operation] operation on X bookmarks..."
- During: "Processed X of Y bookmarks..."
- Final: "Completed! X successful, Y errors."

### 4. `export_bookmarks` (Export Monitoring)

**Parameter**: `monitorProgress: boolean` (default: `false`)

Enables background monitoring of export progress with periodic status updates.

```json
{
  "tool": "export_bookmarks",
  "arguments": {
    "format": "csv",
    "monitorProgress": true
  }
}
```

**Progress Updates**:
- Initial: "Export started. Monitoring progress..."
- During: "Export in progress... (X%)"
- Final: "Export completed! Download: [URL]"

### 5. `export_status` (Continuous Tracking)

**Parameter**: `trackProgress: boolean` (default: `false`)

Enables continuous progress tracking until export completion.

```json
{
  "tool": "export_status",
  "arguments": {
    "trackProgress": true
  }
}
```

## Transport Support

### STDIO Transport

Uses MCP's built-in progress notification system:

```json
{
  "method": "notifications/progress",
  "params": {
    "progressToken": "unique-token",
    "progress": 15,
    "total": 100,
    "message": "Processing 15 of 100 items..."
  }
}
```

### HTTP Transport

Leverages the existing SSE (Server-Sent Events) implementation for real-time progress updates. The HTTP server supports both:

- **Streamable HTTP** (recommended): Modern transport with session management
- **Legacy SSE**: Backwards-compatible transport

## Implementation Details

### Chunked Processing

Large datasets are processed in smaller chunks (typically 10 items per chunk) to:
- Provide granular progress updates
- Prevent memory issues with large datasets
- Allow for graceful cancellation
- Reduce API rate limiting issues

### Error Handling

All streaming operations include comprehensive error handling:
- Individual item failures in batch operations
- Network errors during API calls
- Timeout handling for long-running operations
- Progress notification delivery failures

### Performance Considerations

- **Chunk sizes**: Optimized for balance between progress granularity and performance
- **Delays**: Small delays (100-200ms) between chunks to prevent API rate limiting
- **Memory usage**: Chunks are processed sequentially to minimize memory footprint
- **Cancellation**: Operations respect abort signals when provided

## Usage Examples

### Using with MCP Inspector

```bash
# Start the HTTP server
npm run dev:http

# Connect with MCP Inspector
npx @modelcontextprotocol/inspector http://localhost:3002/mcp

# Call tools with streaming parameters enabled
```

### Programmatic Usage

```typescript
// Enable streaming for search
const result = await client.callTool('bookmark_search', {
  query: 'javascript',
  streamResults: true,
  perPage: 100
}, {
  progressToken: 'search-123',
  onProgress: (progress) => {
    console.log(`Progress: ${progress.progress}/${progress.total} - ${progress.message}`);
  }
});
```

## Metadata Indicators

Tools that support streaming include metadata flags in their responses:

- `streamingSupported: true` - Tool supports streaming for this operation
- `streamedResult: true` - Result was generated using streaming
- `progressEnabled: true` - Progress notifications were sent
- `chunksProcessed: number` - Number of chunks processed

## Configuration

Streaming behavior can be controlled via:

1. **Tool parameters**: Each tool has specific streaming parameters
2. **Environment variables**: No additional configuration needed
3. **Client capabilities**: Automatic detection of progress token support

## Troubleshooting

### Common Issues

1. **No progress notifications**: Ensure client supports progress tokens
2. **Slow streaming**: Check network connectivity and API rate limits
3. **Incomplete results**: Check for errors in progress notification messages
4. **Memory issues**: Reduce chunk sizes or result set size

### Debug Information

Enable debug logging to see detailed streaming information:

```bash
DEBUG=raindrop-mcp:streaming npm run dev:http
```

## Future Enhancements

Potential improvements for streaming functionality:

- **Adaptive chunk sizes** based on network performance
- **Compression** for large progress payloads
- **Resumable operations** for interrupted streams
- **Custom streaming protocols** for specific use cases
- **Real-time result delivery** as items are processed

## Technical Notes

- Progress notifications are sent using the MCP standard `notifications/progress` method
- All streaming operations are optional and backwards-compatible
- HTTP transport uses existing SSE infrastructure for delivery
- STDIO transport uses standard MCP notification routing
- Error conditions don't interrupt the streaming flow but are reported in progress messages