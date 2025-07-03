# STDIO Transport Documentation

## Overview

The STDIO transport implementation in `src/index.ts` provides a Model Context Protocol (MCP) server that communicates exclusively through standard input/output streams. This implementation ensures clean protocol compliance and proper resource management.

## Key Features

### Clean Output Separation
- **stdout**: Contains only valid MCP protocol messages (JSON-RPC 2.0 format)
- **stderr**: Contains all logging, error messages, and diagnostic information
- No extraneous output that could interfere with MCP protocol communication

### Graceful Shutdown Handling
The server handles the following shutdown scenarios:

#### Signal Handlers
- **SIGINT** (Ctrl+C): Graceful shutdown with resource cleanup
- **SIGTERM**: Graceful shutdown for process managers and containers
- **Multiple signals**: Force exit protection to prevent hanging

#### Exception Handlers
- **Uncaught exceptions**: Logged to stderr with stack trace, followed by graceful shutdown
- **Unhandled promise rejections**: Logged to stderr with context, followed by graceful shutdown

### Shutdown Sequence
1. **Signal Detection**: Process receives shutdown signal or exception occurs
2. **Duplicate Prevention**: Prevents multiple shutdown attempts
3. **Resource Cleanup**: Calls service cleanup function to release resources
4. **Server Closure**: Properly closes MCP server connection
5. **Stream Flushing**: Ensures all stderr output is written before exit
6. **Clean Exit**: Process exits with appropriate code (0 for normal, 1 for error)

## Usage

### Standard Operation
```bash
# Run STDIO server (communicates via stdin/stdout)
node build/index.js

# Or using the npm script
npm start
```

### Development/Debug Mode
```bash
# View stderr output while running
node build/index.js 2>debug.log &
tail -f debug.log
```

### Testing Protocol Communication
```bash
# Send MCP initialize message
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node build/index.js
```

## Error Handling

### Startup Errors
- Environment configuration issues (missing RAINDROP_ACCESS_TOKEN)
- Service initialization failures
- Transport connection problems

All startup errors are logged to stderr with descriptive messages and result in process exit code 1.

### Runtime Errors
- Uncaught exceptions are logged with full stack traces
- Unhandled promise rejections are logged with context
- Graceful shutdown is attempted even during error conditions

## Integration Guidelines

### MCP Clients
- Connect using standard stdio transport
- Expect only MCP protocol messages on stdout
- Monitor stderr for diagnostic information if needed

### Process Managers
- Send SIGTERM for graceful shutdown
- Allow reasonable time for cleanup (recommended: 10-30 seconds)
- Use SIGKILL only if SIGTERM fails

### Container Environments
- The server properly handles container stop signals
- Logs are separated for proper container log management
- Clean shutdown prevents resource leaks

## Troubleshooting

### Common Issues

1. **No response from server**
   - Check stderr for initialization errors
   - Verify RAINDROP_ACCESS_TOKEN is set
   - Ensure input is valid JSON-RPC 2.0 format

2. **Unexpected output on stdout**
   - This should not happen - all logging goes to stderr
   - If observed, it indicates a bug that should be reported

3. **Server doesn't shutdown gracefully**
   - Check if cleanup functions are completing
   - Monitor stderr for shutdown process messages
   - Verify signal handling is working

### Debug Output
During shutdown, you'll see messages on stderr like:
```
Received SIGTERM, shutting down gracefully...
Shutdown complete
```

This confirms the graceful shutdown process is working correctly.