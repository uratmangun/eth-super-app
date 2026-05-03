## 1. Tool Component Setup

- [x] 1.1 Add the AI Elements `Tool` component source to the project codebase so it can be imported by the homepage.
- [x] 1.2 Use only non-approval tool states for `web-fetch` rendering.

## 2. Structured Message State

- [x] 2.1 Replace the plain `ChatMessage.content` assistant representation with a part-aware message model.
- [x] 2.2 Keep user messages rendering correctly while migrating assistant messages to part-aware state.

## 3. SSE Parsing

- [x] 3.1 Extend the client stream parser to preserve `text-*` events as ordered text parts.
- [x] 3.2 Extend the client stream parser to preserve `tool-input-available` and `tool-output-available` events.
- [x] 3.3 Preserve tool error states when present.

## 4. Conversation Rendering

- [x] 4.1 Render text parts with the existing AI Elements message components.
- [x] 4.2 Render `web-fetch` tool input and output with AI Elements `Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, and `ToolOutput`.
- [x] 4.3 Ensure tool cards appear inline in assistant conversation flow without approval UI.

## 5. Verification

- [x] 5.1 Run `pnpm typecheck`.
- [x] 5.2 Run `pnpm lint`.
- [x] 5.3 Run `pnpm build`.
- [x] 5.4 Manually test a normal non-tool response and confirm plain assistant text still renders.
- [x] 5.5 Manually test a tool-capable provider and confirm `web-fetch` tool input/output render inline in the chat UI.
