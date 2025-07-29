# Streaming Support Documentation

## Overview

The Raindrop MCP server now includes comprehensive streaming support for large datasets and long-running operations. This document describes the streaming capabilities and how to use them effectively.

## Streaming Capabilities

### Transport Support

#### HTTP Transport (Recommended)
- ✅ **Server-Sent Events (SSE)**: Real-time streaming via SSE
- ✅ **Chunked Transfer Encoding**: Efficient transfer of large responses
- ✅ **Session Management**: Proper session handling for streaming connections
- ✅ **Progress Notifications**: Real-time progress updates for long-running operations

#### STDIO Transport
- ✅ **Streaming Message Format**: Custom streaming format for MCP
- ✅ **Chunked Responses**: Large responses split into manageable chunks
- ✅ **Progress Notifications**: Status updates via stderr
- ✅ **Graceful Fallback**: Automatic detection of streaming needs

## Streaming Tools

### `streamSearchBookmarks`
Search bookmarks with streaming support for large result sets.

**Parameters:**
- `search` (string, optional): Search query
- `collection` (number, optional): Collection ID filter
- `tags` (string[], optional): Tag filters
- `createdStart` (string, optional): Start date filter (ISO format)
- `createdEnd` (string, optional): End date filter (ISO format)
- `important` (boolean, optional): Important bookmarks only
- `media` (enum, optional): Media type filter
- `sort` (string, optional): Sort order
- `chunkSize` (number, optional): Items per chunk (default: 25, max: 50)
- `streaming` (boolean, optional): Enable streaming mode (default: true)

**Use Cases:**
- Searching large bookmark collections
- Exporting search results
- Bulk operations on search results

### `streamHighlights`
Stream highlights with support for large datasets.

**Parameters:**
- `raindropId` (number, optional): Specific raindrop highlights
- `collectionId` (number, optional): Collection highlights
- `chunkSize` (number, optional): Highlights per chunk (default: 25)
- `streaming` (boolean, optional): Enable streaming mode (default: true)

**Use Cases:**
- Fetching all highlights (potentially thousands)
- Processing highlights in batches
- Exporting highlight data

### `streamExportBookmarks`
Export bookmarks with streaming progress updates.

**Parameters:**
- `format` (enum): Export format (csv, html, pdf)
- `collectionId` (number, optional): Export specific collection
- `broken` (boolean, optional): Include broken links
- `duplicates` (boolean, optional): Include duplicates
- `progressUpdates` (boolean, optional): Enable progress streaming (default: true)

**Use Cases:**
- Large export operations
- Monitoring export progress
- Long-running data exports

### `streamImportStatus`
Monitor import progress with streaming updates.

**Parameters:**
- `progressUpdates` (boolean, optional): Enable progress streaming (default: true)

**Use Cases:**
- Monitoring import operations
- Real-time import status
- Long-running import processes

## Streaming Resources

### Standard Resources (Small/Medium Datasets)
- `collections://all` - All collections
- `tags://all` - All tags
- `highlights://all` - All highlights (standard loading)
- `user://info` - User information
- `user://stats` - User statistics

### Streaming Resources (Large Datasets)
- `highlights://stream/all` - All highlights with chunked loading
- `search://stream/{query}` - Search results with streaming
- `highlights://stream/collection/{id}` - Collection highlights with streaming
- `highlights://stream/raindrop/{id}` - Raindrop highlights with streaming
- `collections://stream/all` - Collections with streaming awareness

## When to Use Streaming

### Recommended for Streaming:
1. **Search Operations** with large result sets (>50 items)
2. **All Highlights** fetching (potentially thousands of items)
3. **Export/Import Operations** (long-running processes)
4. **Large Collections** with many bookmarks
5. **Bulk Operations** on multiple items

### Not Needed for Streaming:
1. **Single Item Operations** (get bookmark, get collection)
2. **Small Collections** (<50 items)
3. **User Information** (small, static data)
4. **Tag Lists** (typically small datasets)

## Implementation Examples

### HTTP Client (JavaScript)
```javascript
// Using Server-Sent Events for streaming
const eventSource = new EventSource('/mcp');
eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.meta?.streaming && message.meta?.partial) {
    console.log(`Chunk ${message.meta.chunkIndex + 1}/${message.meta.totalChunks}`);
    // Process chunk
  } else {
    console.log('Streaming complete');
  }
};

// Request streaming search
fetch('/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'streamSearchBookmarks',
      arguments: {
        search: 'javascript',
        streaming: true,
        chunkSize: 25
      }
    },
    id: 1
  })
});
```

### STDIO Client (Command Line)
```bash
# Use the streaming STDIO transport
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"streamSearchBookmarks","arguments":{"search":"javascript","streaming":true}},"id":1}' | node stdio-streaming.js

# Monitor for streaming messages
# Look for messages with meta.streaming = true
```

## Performance Characteristics

### Chunk Sizes
- **Default**: 25 items per chunk
- **Maximum**: 50 items per chunk
- **Recommended**: 25-30 items for optimal performance

### Memory Usage
- **Streaming**: Constant memory usage regardless of dataset size
- **Non-streaming**: Memory usage scales with dataset size
- **Recommended**: Use streaming for datasets >100 items

### Network Efficiency
- **HTTP**: SSE provides real-time streaming with low overhead
- **STDIO**: Chunked messages prevent buffer overflow
- **Compression**: Automatic compression for HTTP transport

## Error Handling

### Streaming Errors
- **Chunk Failures**: Individual chunk failures don't stop the stream
- **Network Issues**: Automatic reconnection for HTTP streams
- **Progress Timeout**: Configurable timeouts for long-running operations

### Fallback Behavior
- **Automatic Detection**: Server automatically determines when to use streaming
- **Graceful Degradation**: Falls back to standard responses if streaming fails
- **Client Override**: Clients can disable streaming with `streaming: false`

## Monitoring and Debugging

### Server Logs
```
[STREAMING] Fetching all highlights with chunked loading...
[STREAMING] Loaded chunk 1: 25 highlights
[STREAMING] Loaded chunk 2: 25 highlights
[STREAMING] Completed loading 1,250 highlights in 50 chunks
```

### Client Debugging
- Check `meta.streaming` field in responses
- Monitor `meta.chunkIndex` and `meta.totalChunks` for progress
- Use browser DevTools Network tab for HTTP streams

### Performance Metrics
- **Chunk Count**: Number of chunks processed
- **Total Time**: End-to-end streaming time
- **Memory Usage**: Peak memory during streaming
- **Network Utilization**: Bandwidth usage patterns

## Configuration

### Environment Variables
```bash
# HTTP streaming configuration
HTTP_CHUNK_SIZE=25
HTTP_STREAM_TIMEOUT=300000
HTTP_MAX_CHUNKS=100

# STDIO streaming configuration  
STDIO_CHUNK_SIZE=25
STDIO_STREAM_DELAY=10
```

### Server Configuration
```javascript
// HTTP server streaming options
const streamingOptions = {
  chunkSize: 25,
  maxChunks: 100,
  timeoutMs: 300000,
  enableProgressUpdates: true
};

// STDIO transport streaming
const stdioOptions = {
  enableStreaming: true,
  chunkSize: 25,
  delayMs: 10
};
```

## Best Practices

### For Large Datasets
1. **Always use streaming** for datasets >100 items
2. **Monitor memory usage** during streaming operations
3. **Implement progress indicators** for user experience
4. **Handle partial failures** gracefully

### For Long-Running Operations
1. **Use progress streaming** for operations >30 seconds
2. **Implement timeouts** for stuck operations
3. **Provide cancellation** mechanisms
4. **Log progress** for debugging

### For Client Applications
1. **Implement proper error handling** for stream interruptions
2. **Show progress indicators** to users
3. **Cache chunks** if needed for offline access
4. **Throttle processing** to avoid overwhelming the UI

## Troubleshooting

### Common Issues

#### Streaming Not Working
- Check if streaming is enabled: `streaming: true`
- Verify dataset size meets streaming threshold
- Check network connectivity for HTTP streams

#### Performance Issues
- Reduce chunk size if memory is constrained
- Increase chunk size if network latency is high
- Monitor server resources during streaming

#### Timeout Issues
- Increase timeout values for slow operations
- Check server logs for bottlenecks
- Verify API rate limits aren't being hit

### Support Commands
```bash
# Check streaming capabilities
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"getStreamingCapabilities"},"id":1}'

# Test streaming search
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"streamSearchBookmarks","arguments":{"search":"test","streaming":true,"chunkSize":10}},"id":1}'
```

This documentation provides comprehensive guidance for using the streaming capabilities effectively in the Raindrop MCP server.