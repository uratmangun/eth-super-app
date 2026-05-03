## Why

The backend can now emit AI SDK tool-calling events, but the current frontend flattens every response into plain assistant text and drops all tool parts. Users therefore cannot see `web-fetch` usage or any future tool outputs inside the conversation, which makes the tool-calling feature effectively invisible.

## What Changes

- Replace the current plain-text-only assistant message state with a structured message-part model that preserves text and tool events.
- Parse AI SDK SSE tool events on the client so `tool-input-available`, `tool-output-available`, and related states are retained instead of discarded.
- Add AI Elements `Tool` rendering for the `web-fetch` tool in assistant messages.
- Skip approval UI entirely for `web-fetch`, because it auto-executes and does not require user confirmation.
- Keep normal text rendering and existing provider-mode behavior working alongside tool rendering.

## Capabilities

### New Capabilities
- `tool-call-ui-rendering`: Client-side parsing and rendering of AI SDK tool-call parts in the chat conversation.

### Modified Capabilities
- `docs-console-tool-calling`: Tool-calling no longer exists only in the backend stream; tool usage becomes visible in the chat UI.
- `zero-g-llm-console`: The homepage chat conversation changes from plain assistant text only to mixed text-and-tool rendering.

## Impact

- Affected UI: `components/home-page-client.tsx` chat state, stream parsing, and assistant message rendering.
- Affected component layer: AI Elements `Tool` component(s) must be added to project source if not already installed locally.
- Affected streaming logic: the manual SSE parsing path must preserve structured parts instead of only concatenating text deltas.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm build`, plus manual browser tests of tool-call rendering.
