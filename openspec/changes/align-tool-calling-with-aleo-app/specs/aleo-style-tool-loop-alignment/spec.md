## ADDED Requirements

### Requirement: Chat architecture aligns with AI SDK-native tool state handling
The app SHALL align its chat architecture with the working Aleo reference patterns so tool-call state is handled using AI SDK-native message semantics rather than brittle text-only reconstruction.

#### Scenario: Tool parts preserved end-to-end
- **WHEN** the backend emits tool-call events in a chat response
- **THEN** the frontend preserves those events in AI SDK-compatible message state instead of flattening them away

#### Scenario: Tool continuation handled through message state
- **WHEN** tool results become available in the conversation
- **THEN** the client/backend flow supports the follow-up assistant step using AI SDK-native message/tool semantics

### Requirement: Provider configuration supports env defaults and request overrides
The app SHALL support both environment-backed defaults and explicit per-request `baseURL` / `apiKey` overrides for OpenAI-compatible providers.

#### Scenario: Env-backed default provider
- **WHEN** no custom `baseURL` or `apiKey` is provided in a request
- **THEN** the chat route uses configured environment defaults when available

#### Scenario: Explicit custom provider override
- **WHEN** a request includes a valid custom `baseURL` and optional `apiKey`
- **THEN** the chat route uses that request-scoped provider configuration instead of forcing env-only settings
