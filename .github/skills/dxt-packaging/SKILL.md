---
name: dxt-packaging
description: MCPB (Model Context Protocol Bundle) Packaging and Distribution
keywords: [mcpb, bundle, packaging, distribution, anthropic, extension, dxt]
---

# MCPB Packaging Skill (DXT legacy)

Guidelines for building and packaging MCP servers as MCP Bundles (MCPB). DXT references are legacy.

## Overview

MCP Bundles (MCPB) allow AI assistants to discover and use MCP servers from a package archive. This skill covers the complete MCPB development workflow.

## Getting Started

### Read the Specifications

1. **Architecture & Overview**: https://github.com/anthropics/mcpb
2. **MCPB Repository**: https://github.com/anthropics/mcpb

- `README.md` - Architecture overview, capabilities, and integration patterns
- `MANIFEST.md` - Complete bundle manifest structure and field definitions
- `examples/` - Reference implementations including a "Hello World" example

### Create Proper Bundle Structure

- Generate a valid `manifest.json` following the MANIFEST.md spec
- Implement an MCP server using `@modelcontextprotocol/sdk` with proper tool definitions
- Include proper error handling and timeout management

## Development Best Practices

### MCP Protocol Communication

- Implement proper MCP protocol communication via stdio transport
- Structure tools with clear schemas, validation, and consistent JSON responses
- Make use of the fact that this bundle will be running locally

### Logging & Debugging

- Add appropriate logging and debugging capabilities
- Use structured logging for error tracking
- Include proper documentation and setup instructions

### Testing Considerations

- Validate that all tool calls return properly structured responses
- Verify manifest loads correctly and host integration works
- Generate complete, production-ready code that can be immediately tested
- Focus on defensive programming and clear error messages
- Follow the exact MCPB specifications to ensure ecosystem compatibility

## Key Files

- **manifest.json** - Bundle metadata and configuration
- **src/index.ts** - Main entry point for the MCP server
- **build/** - Compiled output for distribution

## References

- [MCPB GitHub Repository](https://github.com/anthropics/mcpb)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
