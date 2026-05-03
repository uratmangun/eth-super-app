## Why

The new tool-call UI works, but completed `web-fetch` tool cards open by default and the backend does not yet guarantee a follow-up model step after tool execution. That leaves the conversation feeling unfinished: users see the tool output, but they should usually get a synthesized final answer derived from that tool result.

## What Changes

- Change tool cards so completed `web-fetch` tool calls are collapsed by default in the conversation UI.
- Update the AI SDK chat route to use multi-step tool calling so tool results are passed back into the model for a follow-up completion step.
- Keep the tool loop bounded and safe with explicit step limits or stop conditions.
- Preserve normal non-tool responses and current provider compatibility behavior.

## Capabilities

### New Capabilities
- `tool-loop-completion`: Multi-step tool-calling behavior that continues model generation after tool results are available.

### Modified Capabilities
- `tool-call-ui-rendering`: Tool cards change to a collapsed-by-default presentation for auto-executed tools like `web-fetch`.
- `docs-console-tool-calling`: Tool execution is no longer the terminal state by default; tool results are fed back into the model for a final answer when supported.

## Impact

- Affected UI: `components/ai-elements/tool.tsx` and/or the conversation renderer behavior for default open/closed state.
- Affected chat backend: `app/api/chat/route.ts` tool-calling loop configuration.
- Affected provider behavior: tool-capable providers may now perform multiple steps; non-tool-capable providers must still degrade safely.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm build`, plus manual tool-call checks showing collapsed cards and a post-tool final answer.
