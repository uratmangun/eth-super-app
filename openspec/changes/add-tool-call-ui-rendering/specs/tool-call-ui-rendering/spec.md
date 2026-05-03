## ADDED Requirements

### Requirement: Chat UI preserves structured assistant parts
The client chat state SHALL preserve ordered assistant message parts from the AI SDK SSE stream instead of flattening every response to plain text.

#### Scenario: Text parts preserved
- **WHEN** the client receives `text-delta` events from the SSE stream
- **THEN** the assistant message state accumulates them as ordered text parts that can be rendered in the conversation

#### Scenario: Tool parts preserved
- **WHEN** the client receives tool events such as `tool-input-available` or `tool-output-available`
- **THEN** the assistant message state retains those tool parts instead of discarding them

### Requirement: web-fetch tool calls render inline in conversation
The UI SHALL render `web-fetch` tool calls inline in assistant messages using AI Elements tool components.

#### Scenario: Tool input rendered
- **WHEN** a `web-fetch` tool input becomes available in the SSE stream
- **THEN** the conversation shows a tool card containing the requested URL input

#### Scenario: Tool output rendered
- **WHEN** a `web-fetch` tool output becomes available in the SSE stream
- **THEN** the conversation shows a tool card containing the structured output, including title, final URL, preview text, and output path

#### Scenario: Tool error rendered
- **WHEN** a `web-fetch` tool fails during execution
- **THEN** the conversation shows the tool card in an error state with the error text
