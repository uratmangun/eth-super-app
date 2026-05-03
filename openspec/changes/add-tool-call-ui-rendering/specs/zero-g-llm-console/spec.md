## MODIFIED Requirements

### Requirement: Chatbox remains primary interaction surface
The homepage SHALL keep a chatbox as the primary area where users submit prompts and view responses, while allowing assistant messages to include both text and inline tool-call UI.

#### Scenario: Text response still visible
- **WHEN** the assistant responds without any tool calls
- **THEN** the conversation continues to render normal assistant text responses correctly

#### Scenario: Mixed text and tool content visible
- **WHEN** the assistant response includes both text and tool-call events
- **THEN** the conversation renders the text content and the inline tool UI in stream order within the assistant message flow
