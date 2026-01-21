---
name: dxt-packaging
description: Desktop Extension (DXT) Packaging and Distribution
keywords: [dxt, desktop-extension, packaging, distribution, anthropic, extension]
---

# DXT Packaging Skill

Guidelines for building and packaging MCP servers as Desktop Extensions (DXT) using the Anthropic Desktop Extension framework.

## Overview

Desktop Extensions (DXT) allow AI assistants to discover and use MCP servers from a package archive. This skill covers the complete DXT development workflow.

## Getting Started

### Read the Specifications

1. **Architecture & Overview**: https://www.anthropic.com/engineering/desktop-extensions
2. **DXT Repository**: https://github.com/anthropics/dxt
   - `README.md` - Architecture overview, capabilities, and integration patterns
   - `MANIFEST.md` - Complete extension manifest structure and field definitions
   - `examples/` - Reference implementations including a "Hello World" example

### Create Proper Extension Structure

- Generate a valid `manifest.json` following the MANIFEST.md spec
- Implement an MCP server using `@modelcontextprotocol/sdk` with proper tool definitions
- Include proper error handling and timeout management

## Development Best Practices

### MCP Protocol Communication

- Implement proper MCP protocol communication via stdio transport
- Structure tools with clear schemas, validation, and consistent JSON responses
- Make use of the fact that this extension will be running locally

### Logging & Debugging

- Add appropriate logging and debugging capabilities
- Use structured logging for error tracking
- Include proper documentation and setup instructions

### Testing Considerations

- Validate that all tool calls return properly structured responses
- Verify manifest loads correctly and host integration works
- Generate complete, production-ready code that can be immediately tested
- Focus on defensive programming and clear error messages
- Follow the exact DXT specifications to ensure ecosystem compatibility

## Key Files

- **manifest.json** - Extension metadata and configuration
- **src/index.ts** - Main entry point for the MCP server
- **build/** - Compiled output for distribution

## References

- [Desktop Extensions Docs](https://www.anthropic.com/engineering/desktop-extensions)
- [DXT GitHub Repository](https://github.com/anthropics/dxt)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
