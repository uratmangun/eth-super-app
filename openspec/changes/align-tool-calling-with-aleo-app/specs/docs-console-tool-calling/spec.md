## MODIFIED Requirements

### Requirement: Tool calling degrades safely across provider modes
The system SHALL allow tool-capable provider modes to use the shared `web-fetch` tool without assuming every model/provider supports tool calling, and the implementation SHALL follow the more reliable AI SDK-native patterns demonstrated by the Aleo reference app where applicable.

#### Scenario: Provider supports tool calling
- **WHEN** the selected provider/model supports OpenAI-compatible tool calling
- **THEN** the assistant can invoke `web-fetch`, continue the response using the tool result, and show the tool call in the UI using an AI SDK-native message/tool flow

#### Scenario: Custom provider override remains supported
- **WHEN** the selected provider mode is a custom OpenAI-compatible endpoint with a request-scoped `baseURL` and `apiKey`
- **THEN** tool-calling continues to work without requiring the provider to be configured only through environment variables

#### Scenario: Provider does not support tool calling
- **WHEN** the selected provider/model does not emit tool calls
- **THEN** the chat request still completes as a normal text generation without crashing the UI or backend
