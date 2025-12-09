# MCP SDK Integration Guide

## Overview

This document explains the technical details of integrating Raindrop MCP with the Model Context Protocol (MCP) SDK, particularly focusing on the critical schema registration pattern that enables proper tool validation.

## Schema Registration: The Critical Pattern

### The Problem

When registering tools with the MCP SDK, there's a subtle but crucial requirement for how Zod schemas must be passed to the `registerTool()` method. Passing schemas incorrectly results in runtime errors that are difficult to diagnose.

### The Error

Incorrect schema registration produces this error:
```
TypeError: Cannot read properties of null (reading '_def')
```

This cryptic error occurs during tool invocation when the SDK attempts to validate input parameters.

### The Solution

**Use `.shape` to extract ZodRawShape from ZodObject:**

```typescript
this.server.registerTool(
    toolName,
    {
        description: "Tool description",
        // ✅ CORRECT: Extract .shape property
        inputSchema: (zodSchema as z.ZodObject<any>).shape
    },
    handler
);
```

### Why This Works

The MCP SDK has specific expectations for the `inputSchema` parameter:

#### SDK Type Signature
```typescript
// From @modelcontextprotocol/sdk
registerTool<InputArgs extends ZodRawShape>(
    name: string,
    metadata: {
        description: string;
        inputSchema?: InputArgs;
    },
    handler: (args: z.infer<z.ZodObject<InputArgs>>) => Promise<ToolResult>
): void;
```

**Key insight:** The SDK expects `ZodRawShape`, not `ZodObject`.

#### SDK Internal Behavior
```javascript
// From @modelcontextprotocol/sdk/dist/cjs/server/mcp.js:443
inputSchema: inputSchema === undefined
    ? undefined
    : z.object(inputSchema)
```

**The SDK wraps the inputSchema with `z.object()` internally!**

This means:
- ✅ **If you pass** `ZodRawShape` (plain object) → SDK wraps it → ✅ Creates valid `ZodObject`
- ❌ **If you pass** `ZodObject` (already wrapped) → SDK wraps it again → ❌ Double-wrapped (invalid)

### Zod Type Definitions

**ZodRawShape:**
```typescript
// A plain object mapping strings to Zod schemas
type ZodRawShape = {
    [key: string]: ZodTypeAny;
}

// Example:
const rawShape = {
    name: z.string(),
    age: z.number(),
    email: z.string().email()
}
```

**ZodObject:**
```typescript
// A complete Zod schema created via z.object()
const zodObject = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email()
});
```

**The `.shape` Property:**
```typescript
// ZodObject has a .shape property that returns the original ZodRawShape
const zodObject = z.object({ name: z.string() });
const rawShape = zodObject.shape; // Returns { name: z.string() }
```

## Implementation in Raindrop MCP

### Tool Configuration Structure

Our tool configs are defined as `ZodObject` instances:

```typescript
// tools/raindrop_bookmark_search.ts
export const raindrop_bookmark_search: ToolConfig = {
    name: 'raindrop_bookmark_search',
    description: 'Search for bookmarks...',
    // This is a ZodObject (wrapped)
    inputSchema: z.object({
        query: z.string(),
        collectionId: z.string().optional(),
        tags: z.array(z.string()).optional()
    }),
    handler: async (args, context) => { /* ... */ }
};
```

### Registration Pattern

In `raindropmcp.service.ts`, we register tools by extracting `.shape`:

```typescript
private registerDeclarativeTools() {
    for (const config of toolConfigs) {
        this.server.registerTool(
            config.name,
            {
                title: formatTitle(config.name),
                description: config.description,
                // MCP SDK wraps inputSchema with z.object() internally (mcp.js:443)
                // Therefore it expects ZodRawShape (plain object), not ZodObject
                // Use .shape to extract the plain object that the SDK needs
                inputSchema: (config.inputSchema as z.ZodObject<any>).shape
            },
            this.asyncHandler(async (args: any, extra: any) =>
                config.handler(args, { raindropService: this.raindropService, ...extra })
            )
        );
    }
}
```

### What Happens at Runtime

1. **Tool Config Defines Schema:** `z.object({ query: z.string() })` (ZodObject)
2. **Registration Extracts Shape:** `.shape` → `{ query: z.string() }` (ZodRawShape)
3. **SDK Wraps Schema:** `z.object(inputSchema)` → `z.object({ query: z.string() })` (ZodObject)
4. **Validation Works:** SDK validates incoming parameters against properly formed schema

## Common Mistakes

### ❌ Mistake #1: Passing ZodObject Directly

```typescript
// WRONG: Passing ZodObject without extracting .shape
inputSchema: config.inputSchema
```

**Result:** SDK wraps an already-wrapped schema → Double wrapping → `._def` error

### ❌ Mistake #2: Using zodToJsonSchema

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

// WRONG: Converting to JSON Schema
inputSchema: zodToJsonSchema(config.inputSchema)
```

**Result:** SDK receives JSON Schema instead of Zod schema → Type mismatch → Runtime errors

### ❌ Mistake #3: Defining Schemas as JSON Schema

```typescript
// WRONG: Defining schema as JSON Schema object
inputSchema: {
    type: "object",
    properties: {
        query: { type: "string" }
    }
}
```

**Result:** SDK expects Zod schema, receives JSON Schema → Incompatible types

## Zod Version Compatibility

### Zod 3.x (Supported)
- **Recommended:** `^3.23.8`
- **Status:** Fully compatible with MCP SDK
- **Notes:** Use this version

### Zod 4.x (Does Not Exist)
- **Status:** ❌ Does not exist
- **Common Mistake:** Package managers may show `^4.1.9` due to registry errors
- **Resolution:** Always use `^3.23.8`

To fix version issues:
```bash
# Update package.json
npm install zod@^3.23.8
# or
bun install zod@^3.23.8
```

## Debugging Schema Registration

### Enable MCP SDK Logging

```typescript
// In your server initialization
const server = new Server({
    name: 'raindrop-mcp',
    version: '2.0.16'
}, {
    capabilities: {
        tools: {}
    },
    // Enable debug logging
    logLevel: 'debug'
});
```

### Use MCP Inspector

The MCP Inspector tool helps verify schema registration:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Verify:
1. All tools appear in the tools list
2. Each tool shows its schema in JSON Schema format
3. No validation errors when invoking tools

### Verify Schema Structure

Add logging during registration to verify schemas:

```typescript
private registerDeclarativeTools() {
    for (const config of toolConfigs) {
        console.log(`Registering: ${config.name}`);
        console.log('Schema shape:', Object.keys((config.inputSchema as z.ZodObject<any>).shape));

        this.server.registerTool(/* ... */);
    }
}
```

## Testing Schema Validation

### Test Valid Input

```typescript
// Should succeed
const result = await mcpClient.callTool('raindrop_bookmark_search', {
    query: 'typescript',
    collectionId: '12345'
});
```

### Test Invalid Input

```typescript
// Should fail validation
const result = await mcpClient.callTool('raindrop_bookmark_search', {
    query: 123, // Wrong type: should be string
    invalidField: 'test' // Unknown field
});
```

Expected validation error:
```
Invalid input: Expected string, received number at path: query
```

## References

### MCP SDK Documentation
- Official Docs: https://modelcontextprotocol.io/
- GitHub: https://github.com/modelcontextprotocol/typescript-sdk
- NPM: https://www.npmjs.com/package/@modelcontextprotocol/sdk

### Zod Documentation
- Official Docs: https://zod.dev/
- GitHub: https://github.com/colinhacks/zod
- NPM: https://www.npmjs.com/package/zod

### Key Source Code References
- SDK Tool Registration: `@modelcontextprotocol/sdk/dist/cjs/server/mcp.js:443`
- SDK Type Definitions: `@modelcontextprotocol/sdk/types/server.d.ts`

## Lessons Learned

1. **Trust the SDK:** The MCP SDK knows what it needs. If it expects `ZodRawShape`, provide exactly that.

2. **Read the Source:** Type definitions alone don't reveal runtime behavior. The SDK's internal wrapping (line 443) is only visible in the implementation.

3. **Test Thoroughly:** Schema registration errors only appear at runtime during tool invocation, not during startup.

4. **Don't Guess:** When debugging, research the actual SDK implementation rather than making assumptions about what "should" work.

5. **Document Complexity:** Non-obvious patterns like `.shape` extraction need inline comments explaining the "why."

## Version History

- **2025-11-24:** Initial documentation after comprehensive debugging investigation
- **Author:** Alex Appelbe
- **Related PRs:** #42 (closed - incorrect), #43 (correct implementation)
