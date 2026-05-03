## ADDED Requirements

### Requirement: Chat route supports server-local web-fetch tool calling
The chat backend SHALL expose a server-local `web-fetch` tool to AI SDK `streamText(...)` so models that support tool calling can retrieve documentation content during a conversation.

#### Scenario: Tool is available during chat generation
- **WHEN** the chat route starts a generation request
- **THEN** the AI SDK model execution includes a `web-fetch` tool definition available to the model

#### Scenario: Local URL fetches bypass remote browser service
- **WHEN** the `web-fetch` tool receives an `http` or `https` URL pointing to `localhost`, `127.0.0.1`, or `::1`
- **THEN** the tool fetches the page directly from the local server instead of the remote browser bridge

#### Scenario: External URL fetches use browser-backed fetch
- **WHEN** the `web-fetch` tool receives a non-local `http` or `https` URL
- **THEN** the tool sends the request through the remote browser-backed fetch service and returns the normalized result

#### Scenario: Tool output mirrors OpenCode web-fetch semantics
- **WHEN** the `web-fetch` tool completes successfully
- **THEN** it returns structured output containing at least the requested URL, final URL, title, HTML output path, HTML length, and text preview

### Requirement: Tool calling degrades safely across provider modes
The system SHALL allow tool-capable provider modes to use the shared `web-fetch` tool without assuming every model/provider supports tool calling.

#### Scenario: Provider supports tool calling
- **WHEN** the selected provider/model supports OpenAI-compatible tool calling
- **THEN** the assistant can invoke `web-fetch` and continue the response using the tool result

#### Scenario: Provider does not support tool calling
- **WHEN** the selected provider/model does not emit tool calls
- **THEN** the chat request still completes as a normal text generation without crashing the UI or backend
