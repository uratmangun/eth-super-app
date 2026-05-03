## ADDED Requirements

### Requirement: Tool results are fed back into the model for a follow-up answer
The chat backend SHALL support bounded multi-step tool calling so successful tool results can be processed by the model into a final assistant response.

#### Scenario: Tool call followed by final answer
- **WHEN** a tool-capable provider invokes `web-fetch` successfully
- **THEN** the backend continues the generation with the tool result and returns a follow-up assistant answer when the provider supports multi-step tool calling

#### Scenario: Tool loop remains bounded
- **WHEN** the backend enables multi-step tool calling
- **THEN** it uses an explicit bounded stop condition or step limit to prevent unbounded tool loops
