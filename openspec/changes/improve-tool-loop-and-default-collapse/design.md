## Context

The app now supports backend tool calling and inline tool rendering for `web-fetch`. Two UX/behavior gaps remain:

1. Tool cards currently open by default after completion, which makes the chat visually noisy.
2. The backend does not yet guarantee a follow-up model step after tool execution, so some provider streams stop after the tool result instead of returning a final synthesized answer.

AI SDK supports multi-step tool loops through `streamText(...)` with `stopWhen` and step callbacks. The chat route should use that capability so tool results are fed back into the model when the selected provider/model supports tool calling.

## Goals / Non-Goals

**Goals:**
- Make `web-fetch` tool cards collapsed by default in the conversation UI.
- Configure AI SDK multi-step tool calling so tool results are sent back into the model for a final answer.
- Keep the loop bounded and safe.
- Preserve graceful behavior for providers that do not support tool calling.

**Non-Goals:**
- Do not add approval UI or manual confirmation states.
- Do not redesign the entire chat renderer again.
- Do not guarantee identical multi-step behavior from every provider.

## Decisions

1. **Default tool cards to collapsed after render.**
   - Rationale: the tool is supporting detail, not the main conversational payload. A collapsed default keeps the transcript readable while still exposing the data.
   - Alternative considered: keeping completed tools open. Rejected because it is visually noisy and was explicitly called out by the user.

2. **Use AI SDK multi-step tool calling via `stopWhen` / bounded step looping.**
   - Rationale: AI SDK is designed for the sequence “model → tool → model follow-up”. The backend should explicitly opt into that instead of stopping at `finishReason: tool-calls`.
   - Alternative considered: manually issuing a second model request after tool execution. Rejected because AI SDK already models this flow.

3. **Keep the step count bounded.**
   - Rationale: tool loops must not run indefinitely. Use a small step limit or clear stop condition so the tool result gets one follow-up synthesis step without unbounded recursion.
   - Alternative considered: unbounded looping until provider stop. Rejected for safety and cost reasons.

## Risks / Trade-offs

- **Provider inconsistency** → Some models may still not perform the second step correctly. Mitigation: keep graceful fallback behavior and test at least one tool-capable provider.
- **Longer latency** → Multi-step completion will take longer than single-step tool execution. Mitigation: keep the loop bounded and only use tools when needed.
- **Hidden details when collapsed** → Users might miss tool details. Mitigation: keep headers informative (`web-fetch Completed`) so the user knows a tool ran.

## Migration Plan

1. Change tool header open-state default to collapsed.
2. Update the chat route to use bounded multi-step tool-calling behavior.
3. Verify normal non-tool responses still work.
4. Verify a real `web-fetch` call now results in both a tool card and a final assistant answer.

Rollback is straightforward:
- restore open-by-default tool state
- remove the multi-step tool loop config from the chat route

## Open Questions

- Whether future tools should also default collapsed, or whether this should be configurable per tool type.
