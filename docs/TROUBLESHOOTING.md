# Raindrop MCP Troubleshooting Guide

This guide covers common issues and their solutions when working with Raindrop MCP.

## Table of Contents

- [Schema Registration Errors](#schema-registration-errors)
- [Zod Version Issues](#zod-version-issues)
- [Super-MCP Configuration](#super-mcp-configuration)
- [Authentication Problems](#authentication-problems)
- [Tool Invocation Errors](#tool-invocation-errors)
- [Build and Installation Issues](#build-and-installation-issues)

---

## Schema Registration Errors

### Error: "Cannot read properties of null (reading '_def')"

**Symptoms:**
- Tools appear in MCP Inspector but fail when invoked
- Error occurs during parameter validation
- Both Claude Desktop and Claude Code affected

**Cause:**
Incorrect schema registration - passing `ZodObject` instead of `ZodRawShape` to MCP SDK.

**Solution:**
Ensure `.shape` extraction in tool registration:

```typescript
// ✅ CORRECT
inputSchema: (config.inputSchema as z.ZodObject<any>).shape

// ❌ INCORRECT
inputSchema: config.inputSchema
```

**Verification:**
```bash
# Rebuild and test
bun run build
node build/index.js

# Use MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

**Related Documentation:**
See [MCP_SDK_INTEGRATION.md](./MCP_SDK_INTEGRATION.md) for detailed explanation.

---

## Zod Version Issues

### Error: "Invalid literal value, expected 'object'"

**Symptoms:**
- Schema validation fails during tool registration
- MCP Inspector shows schema errors
- Tools don't appear in available tools list

**Cause:**
Using incompatible Zod version (often listed as `^4.1.9` which doesn't exist).

**Solution:**
Downgrade to Zod 3.x:

```bash
# Update package.json
bun install zod@^3.23.8

# Or with npm
npm install zod@^3.23.8

# Rebuild
bun run build
```

**Verification:**
```bash
# Check installed version
cat package.json | grep zod
# Should show: "zod": "^3.23.8"

# Check lock file
cat bun.lock | grep -A 2 "zod@"
# Should show version 3.x.x
```

**Prevention:**
Always specify exact Zod version range in `package.json`:
```json
{
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

---

## Super-MCP Configuration

### Issue: MCP Not Connecting After Restart

**Symptoms:**
- Claude Desktop shows "Failed to reconnect to super-mcp"
- Claude Code can't connect to MCP server
- Tools unavailable in both clients

**Diagnosis Steps:**

1. **Check Super-MCP HTTP Service (Claude Code):**
```bash
# Check if service is running
launchctl list | grep super-mcp

# Check port availability
lsof -i :3000

# View service logs
tail -f ~/.super-mcp/logs/launchd-stdout.log
tail -f ~/.super-mcp/logs/launchd-stderr.log
```

2. **Check Super-MCP Configuration:**
```bash
# Verify config exists
cat ~/.super-mcp/config.json

# Verify raindrop MCP path is correct
ls -la /Users/[username]/Workspaces/code-projects/raindrop-mcp/build/index.js
```

3. **Check Claude Configurations:**
```bash
# Claude Code config
cat ~/.claude.json

# Claude Desktop config
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Solutions:**

**For HTTP Service (Claude Code):**
```bash
# Restart HTTP service
launchctl unload ~/Library/LaunchAgents/com.user.super-mcp-http.plist
launchctl load ~/Library/LaunchAgents/com.user.super-mcp-http.plist

# Verify it's running
curl http://localhost:3000/mcp
```

**For stdio Service (Claude Desktop):**
- Restart Claude Desktop application
- Super-MCP spawns new process per session (no persistent service needed)

### Issue: Port 3000 Already in Use

**Symptoms:**
- HTTP service fails to start
- Error: "EADDRINUSE: address already in use"

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 [PID]

# Restart super-mcp service
launchctl unload ~/Library/LaunchAgents/com.user.super-mcp-http.plist
launchctl load ~/Library/LaunchAgents/com.user.super-mcp-http.plist
```

### Issue: Raindrop MCP Not Healthy in Super-MCP

**Symptoms:**
- Other MCPs work fine
- Raindrop MCP shows as unhealthy
- Raindrop tools not available

**Diagnosis:**
```bash
# Test raindrop MCP directly
cd /Users/[username]/Workspaces/code-projects/raindrop-mcp
node build/index.js

# Check for errors in super-mcp logs
tail -n 100 ~/.super-mcp/logs/launchd-stderr.log
```

**Common Causes:**
1. **Build is outdated:** Run `bun run build`
2. **Missing dependencies:** Run `bun install`
3. **Schema registration errors:** See [Schema Registration Errors](#schema-registration-errors)
4. **Invalid token:** See [Authentication Problems](#authentication-problems)

---

## Authentication Problems

### Error: "401 Unauthorized"

**Symptoms:**
- Tools fail with authentication error
- "Invalid or expired token" message

**Solution:**

1. **Verify token in config:**
```bash
cat ~/.super-mcp/config.json | grep RAINDROP_ACCESS_TOKEN
```

2. **Get new token from Raindrop.io:**
   - Visit https://app.raindrop.io/settings/integrations
   - Create new test token or use existing one
   - Copy token

3. **Update config:**
```bash
# Edit config
nano ~/.super-mcp/config.json

# Update the env.RAINDROP_ACCESS_TOKEN value
# Save and exit
```

4. **Restart services:**
```bash
launchctl unload ~/Library/LaunchAgents/com.user.super-mcp-http.plist
launchctl load ~/Library/LaunchAgents/com.user.super-mcp-http.plist
```

### Error: "403 Forbidden"

**Cause:**
Token lacks required permissions.

**Solution:**
Create a new token with full permissions at https://app.raindrop.io/settings/integrations

---

## Tool Invocation Errors

### Error: "Invalid input: Expected string, received number"

**Cause:**
Type mismatch in tool parameters.

**Solution:**
Ensure parameters match schema:

```typescript
// ✅ CORRECT
await mcpClient.callTool('raindrop_bookmark_search', {
    query: 'typescript',           // string
    collectionId: '12345',         // string (not number!)
    exactTagMatch: true            // boolean
});

// ❌ INCORRECT
await mcpClient.callTool('raindrop_bookmark_search', {
    query: 123,                    // number instead of string
    collectionId: 12345,           // number instead of string
    exactTagMatch: 'true'          // string instead of boolean
});
```

### Error: "Unknown tool: raindrop_bookmark_search"

**Cause:**
Tool not registered or MCP not connected.

**Diagnosis:**
```bash
# List available tools via super-mcp
# (Method depends on your MCP client)

# Or check MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

**Solutions:**
1. Verify Raindrop MCP is healthy in super-mcp
2. Rebuild: `bun run build`
3. Restart MCP services
4. Check tool registration in `src/services/raindropmcp.service.ts`

---

## Build and Installation Issues

### Error: "Cannot find module"

**Cause:**
Missing dependencies or incorrect build.

**Solution:**
```bash
# Clean install
rm -rf node_modules
rm bun.lock
bun install

# Clean build
rm -rf build
bun run build

# Verify build output
ls -la build/
```

### Error: TypeScript compilation errors

**Common Causes:**
1. **Outdated types:** `bun install --force`
2. **Type mismatches:** Check `tsconfig.json` settings
3. **Missing imports:** Add required packages

**Solution:**
```bash
# Update all dependencies
bun update

# Rebuild
bun run build

# Check for specific errors
bun run build --verbose
```

### Issue: Build succeeds but runtime errors occur

**Cause:**
Source-build mismatch (edited source not rebuilt).

**Solution:**
```bash
# Always rebuild after source changes
bun run build

# For development, use watch mode
bun run build --watch
```

---

## Diagnostic Commands

### Quick Health Check

```bash
#!/bin/bash
echo "=== Raindrop MCP Health Check ==="

echo "\n1. Zod Version:"
cat package.json | grep zod

echo "\n2. Build Status:"
ls -lh build/index.js

echo "\n3. Super-MCP HTTP Service:"
launchctl list | grep super-mcp

echo "\n4. Port 3000 Status:"
lsof -i :3000

echo "\n5. Recent Logs:"
tail -n 5 ~/.super-mcp/logs/launchd-stderr.log

echo "\n6. Token Status:"
if grep -q "RAINDROP_ACCESS_TOKEN" ~/.super-mcp/config.json; then
    echo "Token configured ✓"
else
    echo "Token missing ✗"
fi
```

### Full Restart Procedure

```bash
#!/bin/bash
echo "=== Full Raindrop MCP Restart ==="

# 1. Stop HTTP service
echo "Stopping HTTP service..."
launchctl unload ~/Library/LaunchAgents/com.user.super-mcp-http.plist

# 2. Rebuild
echo "Rebuilding..."
cd /Users/[username]/Workspaces/code-projects/raindrop-mcp
bun run build

# 3. Test direct execution
echo "Testing direct execution..."
timeout 5 node build/index.js || echo "OK (timeout expected)"

# 4. Restart HTTP service
echo "Starting HTTP service..."
launchctl load ~/Library/LaunchAgents/com.user.super-mcp-http.plist

# 5. Verify
echo "Verifying..."
sleep 2
curl http://localhost:3000/mcp && echo "✓ HTTP service running"

# 6. Restart Claude Desktop
echo "Please restart Claude Desktop manually"
```

---

## Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide**
2. **Review recent logs:**
   - Super-MCP: `~/.super-mcp/logs/launchd-stderr.log`
   - Build output: Terminal during `bun run build`
3. **Verify configuration files:**
   - `~/.super-mcp/config.json`
   - `~/.claude.json`
   - `~/Library/Application Support/Claude/claude_desktop_config.json`
4. **Test direct execution:** `node build/index.js`

### Information to Include

When reporting issues, include:

1. **Error message** (exact text)
2. **Steps to reproduce**
3. **Environment:**
   - OS version: `uname -a`
   - Node version: `node --version`
   - Bun version: `bun --version`
   - Zod version: From `package.json`
4. **Recent logs** (last 20 lines of relevant log file)
5. **What you've tried** (troubleshooting steps already attempted)

### Resources

- **MCP SDK Docs:** https://modelcontextprotocol.io/
- **Super-MCP GitHub:** https://github.com/nspr-io/Super-MCP
- **Raindrop API Docs:** https://developer.raindrop.io/
- **Internal Docs:**
  - [MCP_SDK_INTEGRATION.md](./MCP_SDK_INTEGRATION.md) - Schema registration details
  - [CLAUDE_USAGE_GUIDE.md](./CLAUDE_USAGE_GUIDE.md) - Usage patterns
  - [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) - Known limitations

---

## Version History

- **2025-11-24:** Initial troubleshooting guide
- **Author:** Alex Appelbe
- **Last Updated:** 2025-11-24
