## Context

The reference app at `/home/uratmangun/CascadeProjects/aleo-super-app` uses AI SDK tool calling in a more native way than the current app. Key observed differences:

1. **Frontend chat state**
   - Aleo app uses `useChat<ChatUiMessage>` from `@ai-sdk/react`.
   - Tool parts remain in typed `UIMessage` state end-to-end.
   - The UI does not need a custom SSE parser to reconstruct tool parts.

2. **Tool-loop continuation**
   - Aleo app relies on `sendAutomaticallyWhen(...)` with `useChat` and a tool-aware message state to continue after tool results.
   - Our app currently uses a custom fetch + manual stream parsing path, which makes multi-step tool behavior harder to coordinate reliably.

3. **Provider configuration**
   - Aleo app supports both env defaults and per-request `baseURL` / `apiKey` overrides.
   - Our app partially supports custom provider config, but the architecture still feels Router-first and has had edge cases where the UI looked env-bound.

## Goals / Non-Goals

**Goals:**
- Align this app’s tool-calling architecture more closely with the Aleo app’s working AI SDK patterns.
- Reduce reliance on brittle manual SSE parsing where possible.
- Preserve support for both env-backed defaults and explicit per-request custom provider config.
- Improve the chances that tool results continue into final assistant answers through a more AI SDK-native message flow.

**Non-Goals:**
- Do not clone Aleo-specific wallet approval or tool registries.
- Do not turn this app into an Aleo app; only copy the tool-calling architecture lessons.
- Do not remove the existing provider modes unless necessary.

## Decisions

1. **Use the Aleo app as an architectural reference, not a literal transplant.**
   - Rationale: the important lessons are `useChat`-native state, tool-aware continuation, and provider config flow. Aleo-specific tools and approvals are unrelated.

2. **Evaluate shifting this app from manual SSE parsing toward AI SDK-native chat state.**
   - Rationale: the Aleo app’s end-to-end typed `UIMessage` flow is the main reason its tool calling behaves more naturally.
   - Alternative considered: keep layering more custom parser logic onto the existing fetch path. Rejected as the likely source of ongoing complexity.

3. **Preserve dual provider config sources: env defaults plus per-request overrides.**
   - Rationale: Aleo’s `baseURL` / `apiKey` request flow cleanly supports both default and custom providers. This app should do the same consistently.

## Risks / Trade-offs

- **Bigger frontend refactor** → Moving closer to `useChat` is larger than a patch. Mitigation: isolate transport/state migration and keep provider modes stable.
- **Tool approval mismatch** → Aleo has approval-heavy wallet tools; this app mostly has auto-executed tools. Mitigation: reuse the message/tool state pattern, not the approval UX.
- **Regression risk across provider modes** → Router, Direct, and custom modes all share the chat surface. Mitigation: test each mode explicitly after alignment.

## Migration Plan

1. Extract the relevant tool-calling patterns from Aleo:
   - `useChat` state shape
   - automatic continuation
   - provider config request flow
2. Decide whether to migrate fully to `useChat` or to borrow only the transport/state shape.
3. Update this app’s chat route and client message handling accordingly.
4. Verify custom provider mode still supports explicit `baseURL`/`apiKey` overrides.

Rollback is straightforward:
- keep the current manual fetch path and current tool renderer if the alignment proves too invasive.

## Open Questions

- Whether this app should fully adopt `useChat`, or only mirror parts of the Aleo flow while keeping the current custom provider-mode orchestration.
