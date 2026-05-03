## Why

The current app now has backend tool calling and inline tool rendering, but the end-to-end tool loop still behaves less reliably than the Aleo reference app. In `/home/uratmangun/CascadeProjects/aleo-super-app`, tool calls are handled through AI SDK `useChat`, typed `UIMessage` tool parts, and automatic continuation after tool results. That architecture works more naturally than the current custom SSE parsing path in this app.

## What Changes

- Analyze and align this app’s tool-calling flow with the working Aleo app patterns where appropriate.
- Replace or reduce the custom SSE parsing path in favor of AI SDK `useChat` / typed `UIMessage` handling if feasible.
- Make tool-result continuation behave more like Aleo’s `sendAutomaticallyWhen(...)` flow after tool outputs are available.
- Preserve support for user-supplied OpenAI-compatible base URL and API key while also supporting env-backed defaults.
- Remove the accidental coupling where a provider appears to require only env configuration when a per-request custom provider should also work.

## Capabilities

### New Capabilities
- `aleo-style-tool-loop-alignment`: Chat transport and tool-loop behavior aligned with the working Aleo AI SDK pattern.

### Modified Capabilities
- `tool-call-ui-rendering`: The current custom parser/renderer path may be replaced or simplified to match AI SDK-native message/tool handling.
- `docs-console-tool-calling`: Tool results should continue into final assistant answers more reliably, following the Aleo app’s flow.
- `zero-g-llm-console`: Provider configuration behavior should support both env-backed defaults and per-request custom OpenAI-compatible settings more consistently.

## Impact

- Affected frontend: `components/home-page-client.tsx` chat transport/state may need a substantial refactor.
- Affected backend: `app/api/chat/route.ts` and related chat helpers may be reshaped to better match the Aleo route and shared model-resolution pattern.
- Affected provider config flow: custom OpenAI-compatible provider handling versus env defaults.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm build`, plus manual tool-call loop testing against at least one tool-capable model.
