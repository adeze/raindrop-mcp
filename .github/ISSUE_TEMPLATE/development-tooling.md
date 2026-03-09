## 🔧 Enhancement: Add Development Scripts and Tools for HTTP Transport

### Summary

Add comprehensive development scripts, testing utilities, and VS Code integration for the new HTTP SSE transport implementation.

### Background

With the addition of HTTP SSE transport support, we need proper development tooling to make it easy for developers to work with both transport types (STDIO and HTTP).

### Requirements

#### 1. Package.json Scripts

- [ ] `dev:http` - Development mode with auto-reload for HTTP server
- [ ] `start:http` - Production HTTP server startup
- [ ] `test:http` - Test HTTP client connectivity
- [ ] `inspector:http` - MCP Inspector integration for HTTP debugging
- [ ] `health` - Quick health check command
- [ ] `debug:http` - Alias for inspector with HTTP server

#### 2. Test Client Implementation

- [ ] Backwards-compatible client that tries Streamable HTTP first
- [ ] Automatic fallback to SSE transport if Streamable HTTP fails
- [ ] Health check functionality
- [ ] Comprehensive capability testing
- [ ] Tool and resource enumeration
- [ ] Sample tool call validation

#### 3. VS Code Tasks

- [ ] "Start HTTP Server" - Background task for development
- [ ] "Dev HTTP Server" - Development mode with auto-reload
- [ ] "Test HTTP Client" - Run connectivity tests
- [ ] "Debug HTTP Server with Inspector" - Debug with MCP Inspector

#### 4. Build System Updates

- [ ] Include new HTTP server files in build process
- [ ] Update TypeScript compilation for new modules
- [ ] Ensure proper ESM module handling

### Implementation Details

#### New Scripts (package.json)

```json
{
  "scripts": {
    "dev:http": "bun --watch src/http-server.ts",
    "start:http": "bun run src/http-server.ts",
    "test:http": "bun run src/test-client.ts",
    "inspector:http": "npx @modelcontextprotocol/inspector bun run src/http-server.ts",
    "health": "curl -s http://localhost:3001/health | jq",
    "debug:http": "bun run inspector:http"
  }
}
```

#### Test Client Features (`src/test-client.ts`)

- **Connection Testing**: Try modern transport first, fallback to legacy
- **Health Monitoring**: Check server status and session counts
- **Capability Validation**: Verify tools and resources are accessible
- **Error Handling**: Graceful failure with informative messages
- **Environment Support**: Configurable server URL via environment variables

#### VS Code Integration (`.vscode/tasks.json`)

```json
{
  "tasks": [
    {
      "label": "Start HTTP Server",
      "type": "shell",
      "command": "bun",
      "args": ["run", "start:http"],
      "group": "build",
      "isBackground": true
    }
  ]
}
```

### Acceptance Criteria

#### Scripts Work Correctly

- [ ] `bun run dev:http` starts server with auto-reload
- [ ] `bun run start:http` starts production HTTP server
- [ ] `bun run test:http` connects and validates server
- [ ] `bun run health` returns server status JSON
- [ ] `bun run inspector:http` opens MCP Inspector

#### Test Client Functionality

- [ ] Connects via Streamable HTTP transport
- [ ] Falls back to SSE transport when needed
- [ ] Reports server health status
- [ ] Lists available tools and resources
- [ ] Handles connection failures gracefully

#### VS Code Integration

- [ ] Tasks appear in VS Code task runner
- [ ] Background tasks run without blocking
- [ ] Debug task integrates with Inspector
- [ ] Tasks use correct working directory

#### Build System

- [ ] `bun run build` includes all new files
- [ ] TypeScript compilation succeeds
- [ ] Built files are properly structured
- [ ] Module imports work correctly

### Testing

- [ ] Verify all scripts execute without errors
- [ ] Test client connection scenarios (success/failure)
- [ ] Validate VS Code task functionality
- [ ] Confirm build system includes new files
- [ ] Test Inspector integration

### Documentation Updates

- [ ] Update README with new script commands
- [ ] Document test client usage
- [ ] Add VS Code development setup instructions
- [ ] Include troubleshooting for common issues

### Benefits

1. **Developer Experience**: Easy commands for development workflow
2. **Testing**: Automated validation of HTTP transport
3. **Debugging**: Integrated Inspector support for HTTP
4. **IDE Integration**: Seamless VS Code development
5. **Quality Assurance**: Consistent testing and validation

### Dependencies

- Requires completion of HTTP SSE implementation (#XX)
- May need `jq` for JSON formatting in health command
- VS Code tasks require workspace configuration

---

**Priority**: Medium
**Effort**: Small  
**Impact**: Medium - Significantly improves developer experience
