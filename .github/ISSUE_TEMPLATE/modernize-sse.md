## 🔄 Refactor: Modernize Legacy SSE Implementation

### Summary

Update the existing `src/sse.ts` legacy SSE server implementation to use modern patterns, improve error handling, and align with the new HTTP server architecture.

### Background

The current `src/sse.ts` file uses deprecated patterns and lacks proper session management. With the new HTTP server implementation as a reference, we should modernize the legacy SSE server while maintaining backwards compatibility.

### Current Issues

- [ ] Uses deprecated `SSEServerTransport` patterns
- [ ] Global transport variable prevents concurrent connections
- [ ] Missing proper error handling and logging
- [ ] No CORS support for web clients
- [ ] Lacks session management and cleanup
- [ ] No health monitoring or status endpoints

### Requirements

#### 1. Architecture Improvements

- [ ] Remove global transport variable
- [ ] Implement proper session management with unique IDs
- [ ] Add session tracking and cleanup
- [ ] Support concurrent SSE connections
- [ ] Align with HTTP server patterns

#### 2. Middleware and Features

- [ ] Add JSON parsing middleware
- [ ] Implement CORS headers
- [ ] Add request logging with session tracking
- [ ] Proper error handling with HTTP status codes
- [ ] Graceful shutdown handling

#### 3. Enhanced Endpoints

- [ ] `/sse` - SSE connection with session ID generation
- [ ] `/messages` - Message handling with session validation
- [ ] `/health` - Health check for SSE server
- [ ] Session ID tracking in headers

#### 4. Error Handling

- [ ] Connection error handling
- [ ] Session validation
- [ ] JSON-RPC 2.0 compliant error responses
- [ ] Proper HTTP status codes
- [ ] Logging for debugging

### Implementation Details

#### Session Management

```typescript
// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

// Generate unique session IDs
const sessionId = randomUUID();

// Track sessions in headers
res.setHeader("X-Session-Id", sessionId);
```

#### Enhanced Error Handling

```typescript
try {
  // Connection logic
} catch (error) {
  console.error("SSE connection error:", error);
  if (!res.headersSent) {
    res.status(500).send("Failed to establish SSE connection");
  }
}
```

#### CORS Support

```typescript
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Session-Id");
  next();
});
```

### Acceptance Criteria

#### Functionality

- [ ] SSE server starts without errors
- [ ] Supports multiple concurrent SSE connections
- [ ] Session IDs are properly generated and tracked
- [ ] Messages are routed to correct sessions
- [ ] Cleanup occurs when connections close

#### Error Handling

- [ ] Connection errors are logged and handled gracefully
- [ ] Invalid session IDs return proper error responses
- [ ] JSON-RPC 2.0 compliant error format
- [ ] HTTP status codes match error conditions

#### Integration

- [ ] Works with existing MCP service
- [ ] Compatible with MCP Inspector
- [ ] Maintains backwards compatibility with existing SSE clients
- [ ] Can run alongside HTTP server

#### Code Quality

- [ ] Consistent with HTTP server patterns
- [ ] Proper TypeScript types
- [ ] Comprehensive error handling
- [ ] Clear logging and debugging output

### Migration Impact

❌ **No breaking changes** - Existing SSE clients will continue to work without modification.

### Testing Requirements

- [ ] Unit tests for session management
- [ ] Integration tests with multiple concurrent connections
- [ ] Error handling validation
- [ ] Backwards compatibility verification
- [ ] Performance testing under load

### Benefits

1. **Reliability**: Better error handling and session management
2. **Scalability**: Support for concurrent connections
3. **Maintainability**: Consistent patterns with HTTP server
4. **Debugging**: Improved logging and error reporting
5. **Web Support**: CORS enabled for browser clients

### Files Modified

- `src/sse.ts` - Main SSE server implementation
- May need updates to imports and types

### Dependencies

- Should reference patterns from HTTP server implementation (#XX)
- Requires testing with existing SSE clients
- May need documentation updates

---

**Priority**: Medium
**Effort**: Small
**Impact**: Medium - Improves reliability and consistency of legacy transport
