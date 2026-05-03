## MODIFIED Requirements

### Requirement: web-fetch tool calls render inline in conversation
The UI SHALL render `web-fetch` tool calls inline in assistant messages using AI Elements tool components, and the tool cards SHALL be collapsed by default.

#### Scenario: Tool input rendered
- **WHEN** a `web-fetch` tool input becomes available in the SSE stream
- **THEN** the conversation shows a tool card containing the requested URL input

#### Scenario: Tool output rendered
- **WHEN** a `web-fetch` tool output becomes available in the SSE stream
- **THEN** the conversation shows a tool card containing the structured output, including title, final URL, preview text, and output path

#### Scenario: Tool error rendered
- **WHEN** a `web-fetch` tool fails during execution
- **THEN** the conversation shows the tool card in an error state with the error text

#### Scenario: Tool card collapsed by default
- **WHEN** a `web-fetch` tool card is rendered in the conversation
- **THEN** the card starts in a collapsed state instead of expanding automatically
