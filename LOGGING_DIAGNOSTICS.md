# Logging and Diagnostics

This document describes the logging and diagnostics approach for the Raindrop MCP Server.

## Overview

The Raindrop MCP Server implements a logging system that is safe for use with both STDIO and HTTP transports, ensuring the MCP protocol is never polluted with log output.

## Key Design Principles

### 1. STDIO-Safe Logging

- **Problem**: Console output (`console.log`, `console.error`) pollutes STDIO when using MCP's STDIO transport
- **Solution**: All logging uses stderr (`process.stderr.write`) to avoid interfering with the MCP protocol on stdout

### 2. Structured Logging

- Timestamps and log levels for all messages
- Context-aware logging with child loggers
- Environment-based log level configuration

### 3. Transport Awareness

- STDIO transport: Uses stderr for all logging
- HTTP transport: Can safely use both stderr logging and optional console output
- Logging behavior is consistent across both transport types

## Implementation

### Logger Utility (`src/utils/logger.ts`)

The logger utility provides:

```typescript
import { createLogger } from './utils/logger.js';

const logger = createLogger('context-name');

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', errorObject);
```

### Features

- **Log Levels**: debug, info, warn, error
- **Environment Configuration**: Set `LOG_LEVEL=debug` in environment
- **Child Loggers**: Context-aware logging with prefixes
- **Safe Output**: Uses stderr exclusively to avoid STDIO pollution

### Usage in Different Components

#### STDIO Server (`src/index.ts`)
- Uses logger for all output including errors
- No console.* calls that could pollute MCP protocol
- Graceful error handling with proper logging

#### HTTP Servers (`src/http-server-optimized.ts`)
- Uses logger for consistency
- HTTP mode allows more flexibility but maintains consistent logging
- Session management and error logging

#### MCP Services
- Internal logging disabled (`capabilities.logging: false`)
- Uses external logger for diagnostics when needed

## Diagnostics Tool

### MCP Diagnostics Tool

The server provides a built-in `diagnostics` tool accessible via MCP:

```json
{
  "method": "tools/call",
  "params": {
    "name": "diagnostics",
    "arguments": {
      "includeEnvironment": false
    }
  }
}
```

### Information Provided

- **Server Info**: Version, uptime, process details
- **Capabilities**: MCP features and transport support
- **Logging Status**: Current log level, STDIO safety confirmation
- **Memory Usage**: Current memory consumption
- **Tool Statistics**: Number of available tools and categories
- **Environment**: Optional environment variable status (masked for security)

### Usage Examples

#### Basic Diagnostics
```bash
# Via MCP Inspector
npx @modelcontextprotocol/inspector bun run src/index.ts
# Call the 'diagnostics' tool

# Via HTTP
curl -X POST http://localhost:3002/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"diagnostics","arguments":{}},"id":1}'
```

#### Detailed Diagnostics (with environment info)
```bash
# Include environment variables (sensitive info masked)
# Call 'diagnostics' tool with: {"includeEnvironment": true}
```

## Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `debug` | Detailed information | Development, troubleshooting |
| `info` | General information | Normal operation status |
| `warn` | Warning conditions | Non-critical issues |
| `error` | Error conditions | Failures, exceptions |

## Configuration

### Environment Variables

```bash
# Set log level (default: info)
LOG_LEVEL=debug

# Other relevant variables
RAINDROP_ACCESS_TOKEN=your_token
HTTP_PORT=3002
```

### Runtime Configuration

```typescript
import { logger } from './utils/logger.js';

// Change log level at runtime
logger.setLevel('debug');

// Create contextual logger
const contextLogger = logger.child('component-name');
```

## Transport-Specific Behavior

### STDIO Transport
- **Entry Point**: `src/index.ts`
- **Protocol**: MCP over stdin/stdout
- **Logging**: stderr only (never pollutes protocol)
- **Debugging**: Use diagnostics tool or inspector

### HTTP Transport
- **Entry Point**: `src/http-server-optimized.ts`
- **Protocol**: MCP over HTTP
- **Logging**: stderr (consistent with STDIO)
- **Debugging**: Health endpoint `/health` + diagnostics tool

## Troubleshooting

### Common Issues

1. **No log output**: Check `LOG_LEVEL` environment variable
2. **STDIO pollution**: Verify no `console.*` calls in STDIO code paths
3. **Missing diagnostics**: Ensure diagnostics tool is available in tool list

### Debug Steps

1. **Check server status**:
   ```bash
   # For HTTP server
   curl http://localhost:3002/health
   
   # For STDIO server - use MCP inspector
   npx @modelcontextprotocol/inspector bun run src/index.ts
   ```

2. **Get diagnostics**:
   - Use the `diagnostics` MCP tool
   - Check log level and STDIO safety status

3. **Adjust logging**:
   ```bash
   LOG_LEVEL=debug bun run src/index.ts
   ```

## Best Practices

### For Developers

1. **Always use logger**: Never use `console.*` in production code
2. **Context logging**: Create child loggers for components
3. **Appropriate levels**: Use correct log levels for messages
4. **Error handling**: Log errors with context information

### For Debugging

1. **Start with diagnostics**: Use the built-in diagnostics tool
2. **Check transport type**: Verify which transport is being used
3. **Environment check**: Confirm environment variables are set
4. **Log level**: Increase verbosity with `LOG_LEVEL=debug`

### For Production

1. **Log level**: Use `info` or `warn` level for production
2. **Error monitoring**: Monitor stderr output for errors
3. **Health checks**: Use HTTP health endpoints for monitoring
4. **Resource usage**: Monitor memory usage via diagnostics

## Technical Details

### Why stderr?

- MCP STDIO transport uses stdout for protocol communication
- stderr is separate stream that won't interfere with MCP messages
- Allows logging even in STDIO mode without protocol pollution

### Logger Implementation

- Synchronous writes to stderr for immediate output
- Structured format with timestamps and levels
- Memory efficient with minimal overhead
- Thread-safe for concurrent usage

### Diagnostics Integration

- Built into MCP server as standard tool
- Provides comprehensive server status
- Safe for production use (sensitive data masked)
- Consistent across all transport types