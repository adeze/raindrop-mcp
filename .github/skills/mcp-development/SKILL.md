---
name: mcp-development
description: MCP Server Development Patterns and Best Practices
keywords: [mcp, server, typescript, design-patterns, protocol-compliance]
---

# MCP Server Development Skill

Guidelines for designing and implementing MCP servers with TypeScript, focusing on protocol compliance, service architecture, and extensibility.

## MCP Server Design Patterns

- **Protocol Compliance**: All server logic must strictly follow the Model Context Protocol (MCP) specification. Reference [MCP docs](https://modelcontextprotocol.io/) and [LLMs integration guide](https://modelcontextprotocol.io/llms-full.txt).
- **Transport Abstraction**: Implement transport-agnostic logic. Use interfaces and dependency injection for HTTP, STDIO, or custom transports.
- **Service Layer**: Encapsulate business logic in service classes. Each service should be stateless, testable, and expose clear async methods for protocol operations.
- **Schema Validation**: Use `zod` for all input/output validation. Define schemas for requests, responses, and errors. Validate at the transport boundary.
- **Error Handling**: Centralize error handling. Return MCP-compliant error objects with descriptive messages and codes.
- **Manifest & Tooling**: Expose a manifest endpoint/tool for host integration. Manifest must declare all supported operations, schemas, and metadata.
- **Extensibility**: Design for easy addition of new tools/operations. Use a registry or factory pattern for tool handlers.
- **Testing**: Use [Vitest](https://vitest.dev/) for all tests. Place tests in `tests/` and cover protocol, service, and transport logic.
- **Logging**: Use a configurable logger. Avoid `console.log` for STDIO servers; use structured logging and log levels.
- **Async/Await**: All operations must be async.
- **Type Safety**: Use TypeScript interfaces and types for all protocol objects.
- **Configuration**: Use environment variables and config files for secrets, endpoints, and options.
- **Documentation**: Document all public classes, methods, and schemas.

## Tool Implementation Patterns

- **Tool Registration**: Register each tool in a central registry or manifest. Use a factory or mapping to resolve tool handlers by name.
- **Tool Handler Structure**: Implement each tool as a class or function with a clear async `run` or `execute` method. Accept validated input, return structured output.
- **Schema-Driven**: Define input/output schemas with `zod`. Validate all tool calls at runtime.
- **Error Propagation**: Catch errors in tool handlers and return MCP-compliant error objects.
- **Resource Access**: For resource tools (e.g., collections, bookmarks), encapsulate resource logic in dedicated service classes. Use dependency injection for external APIs.
- **Declarative Manifest**: Ensure all tools and resources are declared in the manifest with their schemas, descriptions, and metadata.
- **Isolation**: Tools should be stateless and not share mutable state. Use context objects for per-request data.
- **Extensibility**: New tools/resources should be easy to add by implementing a handler and updating the manifest/registry.

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Boilerplate](https://github.com/cyanheads/mcp-ts-template)
- [Raindrop.io API](https://developer.raindrop.io)
- [MCP Inspector Tool](https://github.com/modelcontextprotocol/inspector)
