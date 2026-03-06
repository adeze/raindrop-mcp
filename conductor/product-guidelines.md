# Product Guidelines

## Design Principles
- **Minimalism:** Provide clear, concise tool outputs that focus on essential data.
- **Context Awareness:** Leverage MCP Resource Links to provide full context only when explicitly requested by the assistant.
- **Predictability:** Ensure consistent naming conventions across tools and resources.

## Prose Style
- **Technical yet Accessible:** Use professional terminology but keep explanations simple for the AI to parse easily.
- **Action-Oriented:** Focus on the intent of the user (e.g., Finding bookmarks about AI).

## UX / UI Principles (for AI interactions)
- **Safety First:** Destructive actions (delete) should be explicit and clearly documented.
- **Graceful Degradation:** Handle API errors and rate limits by providing helpful suggestions to the user.
- **Information Density:** Avoid long payloads; prioritize links and metadata summaries.

## Quality Standards
- **Schema Validation:** Use Zod for strict validation of all tool inputs and outputs.
- **Test Coverage:** Maintain high coverage for tool execution logic.
- **Log Transparency:** Use structured logging for easier debugging of API interactions.
