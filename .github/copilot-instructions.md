---
applyTo: "**"
---

# GitHub Copilot & AI Assistant Instructions

## General Coding Principles

- Write modular, well-documented, and maintainable code.
- Use modern, type-safe, idiomatic TypeScript. Prefer interfaces for object types and camelCase/PascalCase naming conventions.
- Use zod for schema validation where appropriate.
- Use async/await for all asynchronous code.
- Group imports by type (external, then internal).
- Use try/catch for error handling with descriptive messages.
- Prefer explicitness and reference documentation or example repos if ambiguous.

## Raindrop.io & MCP API Coverage

- Ensure complete coverage for Raindrop.io and MCP endpoints.
- Reference [Raindrop.io API docs](https://developer.raindrop.io) for endpoints, authentication, and data models.
- Reference [`raindropio/app`](https://github.com/raindropio/app) for implementation details and usage patterns.
- LLM friendly documentation is `https://context7.com/context7/developer_raindrop_io/llms.txt`
- Reference [Model Context Protocol docs](https://modelcontextprotocol.io/) and [LLMs integration guide](https://modelcontextprotocol.io/llms-full.txt) for MCP compliance.
- Reference [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) for usage patterns.

## Project Structure

- Source: `src/`
- Build: `build/`
- Tests: `tests/` (all test files must be here)

## Development Best Practices

- Structure tools with clear schemas, validation, and consistent JSON responses.
- Include documentation and setup instructions.
- Use design patterns for maintainability and scalability.
- Use helper functions to reduce duplication.
- Prefer declarative programming styles and common libraries/utilities.
- Use `bun` for package management/scripts (not npm).

## Testing

- Use [Vitest](https://vitest.dev/) for all tests.
- Validate tool calls return properly structured responses.
- Verify manifest loads and host integration works.

## Tooling & References

- For debugging MCP servers, see [MCP Debugging Instructions](https://modelcontextprotocol.io/docs/tools/debugging).
- Use [Inspector tool](https://modelcontextprotocol.io/docs/tools/inspector) and [repo](https://github.com/modelcontextprotocol/inspector) for protocol inspection.
- Use `#concept7` for documentation access and reference for SDKs, APIs, and protocol details.
- MCP Protocol spec: [specification](https://github.com/modelcontextprotocol/specification)
- MCP server examples: [`modelcontextprotocol/serverstypescript-sdk/src/examples/README.md`](https://github.com/modelcontextprotocol/serverstypescript-sdk/src/examples/README.md)
- LLM-friendly docs: [context7.com/context7/developer_raindrop_io/llms.txt](https://context7.com/context7/developer_raindrop_io/llms.txt)
- MCP boilerplate: [`cyanheads/mcp-ts-template`](https://github.com/cyanheads/mcp-ts-template)

## Output Requirements

- Generate complete, production-ready code that can be immediately tested.
- Focus on defensive programming, clear error messages, MCP Protocol and DXT specification compatibility.
- always consider the simplest solution that meets the requirements that leveragees existing libraries and patterns.
- configuration and declarative programming should be preferred over imperative programming.
