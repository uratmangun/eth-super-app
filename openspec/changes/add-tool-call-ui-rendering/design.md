## Context

The backend now supports AI SDK tool calling and emits `web-fetch` tool events in the SSE stream. However, the frontend in `components/home-page-client.tsx` still stores chat messages as plain `{ id, role, content }` objects and reduces every streamed response to assistant text via `extractAssistantTextFromUIMessageStream(...)`. This means tool-call events such as `tool-input-available` and `tool-output-available` are discarded before React rendering.

The user wants the UI to render tool calls using AI Elements `Tool` components, but explicitly without approval UI because `web-fetch` auto-executes. This requires a client-side message-state refactor, not just a view-layer change.

## Goals / Non-Goals

**Goals:**
- Preserve structured assistant parts from AI SDK SSE streams instead of flattening them to plain text.
- Render `web-fetch` tool calls inline in the conversation using AI Elements `Tool` components.
- Keep normal assistant text rendering working alongside tool rendering.
- Skip all approval-requested UI states for `web-fetch`.

**Non-Goals:**
- Do not redesign the full chat transport around `useChat` if an incremental parser approach works.
- Do not add approval flows for tools in this change.
- Do not add new backend tool semantics; this change is about rendering existing tool events.

## Decisions

1. **Use an incremental client-side SSE parser instead of refactoring the whole app to `useChat`.**
   - Rationale: the current provider-mode orchestration, direct SDK branch, and custom transport logic are already custom. A focused parser change is smaller and safer than replacing the whole chat stack.
   - Alternative considered: migrating to AI SDK `useChat` / full `UIMessage` state. Rejected for now because it would be a much broader architectural rewrite.

2. **Replace plain `ChatMessage.content` with part-aware assistant state.**
   - Rationale: tool rendering requires preserving ordered text and tool parts in the same assistant message.
   - Alternative considered: rendering tools as separate synthetic messages. Rejected because it loses ordering fidelity between text and tool output.

3. **Add or install a local AI Elements `Tool` component into project source.**
   - Rationale: the app cannot import from skill example files. The actual reusable component must live in the project codebase.
   - Alternative considered: hand-rolling a one-off tool card. Rejected because the user explicitly wants AI Elements tool UI.

4. **Map only non-approval tool states for `web-fetch`.**
   - Rationale: `web-fetch` executes immediately, so approval-requested states would be misleading.
   - Alternative considered: showing generic collapsible approval-themed tool cards. Rejected because it conflicts with the actual behavior.

## Risks / Trade-offs

- **Manual SSE parsing complexity** → The client must track event ordering carefully. Mitigation: keep the parser narrowly scoped to the event types the app currently needs.
- **Mixed content rendering bugs** → Tool and text parts may appear out of order if state updates are wrong. Mitigation: preserve stream order explicitly and test a real tool-capable provider.
- **Future AI SDK event changes** → Manual parsing may need maintenance. Mitigation: keep parsing code centralized and only rely on currently emitted event types.

## Migration Plan

1. Add a local AI Elements `Tool` component to the app codebase.
2. Introduce a richer assistant message model with ordered parts.
3. Update the SSE parser to capture `text-*` and `tool-*` events.
4. Render assistant parts as mixed text/tool content.
5. Verify Router/custom text responses still work and verify a tool-capable provider shows `web-fetch` UI.

Rollback is straightforward:
- revert to plain text-only assistant message parsing
- remove the tool renderer component

## Open Questions

- Whether future tools should share a generic renderer map keyed by tool name, or whether `web-fetch` should be the only tool-specific renderer for now.
