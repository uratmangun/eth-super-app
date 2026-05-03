## Context

The app is already a multi-provider chat console built on Next.js App Router, AI SDK `streamText`, and a client homepage in `components/home-page-client.tsx`. It currently supports 0G Router testnet, 0G Direct SDK, and custom OpenAI-compatible providers, but the user experience and system prompt still carry assumptions from the older template-chat and 0G-only phases.

The new product direction is a documentation-first research console that helps users learn from five reference ecosystems:
- 0G: `https://docs.0g.ai/ai-context.md`
- Uniswap: `https://developers.uniswap.org/docs/uniswap-ai/llms.txt`
- Gensyn: `https://docs.gensyn.ai/tech/agent-exchange-layer.md`
- ENS: `https://docs.ens.domains/llms.txt`
- KeeperHub: `https://docs.keeperhub.com/`

The current chat route has no tool-calling support. The user wants a server-local AI SDK tool named `web-fetch` that mimics the OpenCode tool behavior in `/home/uratmangun/.config/opencode/tools/web-fetch.ts`, and they want tool usage to be available for any provider mode whose model supports tool calling.

## Goals / Non-Goals

**Goals:**
- Add AI SDK tool calling to the server chat route using a server-local `web-fetch` tool.
- Keep the tool implementation close in semantics to the existing OpenCode `web-fetch` tool.
- Replace the repository-template system prompt with a docs-console system prompt focused on the five supported sources.
- Update the empty state and suggested prompts so the homepage invites documentation research across all five ecosystems instead of only 0G questions.
- Preserve the existing multi-provider model while allowing tool calling for any supporting provider/model.

**Non-Goals:**
- Do not build a generic browser automation system inside the app.
- Do not add persistent server-side storage for fetched documents or user sessions.
- Do not guarantee that every model/provider supports tool calling.
- Do not redesign the entire homepage layout beyond the prompting/copy/tooling shifts required by this change.

## Decisions

1. **Implement `web-fetch` as a server-local AI SDK tool rather than trying to invoke the OpenCode plugin runtime.**
   - Rationale: the app server already controls `streamText(...)` and can expose tools directly to the model. The OpenCode tool file is a reference implementation, not a runtime dependency the Next app should couple to.
   - Alternative considered: shelling out to or bridging into the OpenCode tool runtime. Rejected because it adds portability, deployment, and coupling problems.

2. **Mirror the OpenCode tool’s behavior closely.**
   - Rationale: the existing `web-fetch` tool already defines the desired semantics: direct fetch for local URLs, remote browser-backed fetch for external pages, HTML persistence to a temp file, and a compact JSON response with title and preview.
   - Alternative considered: a minimal plain fetch that only returns text. Rejected because it loses parity with the existing workflow and is less useful for debugging or citations.

3. **Attach tools directly to `streamText(...)` in `app/api/chat/route.ts`.**
   - Rationale: this route already validates UI messages, converts them to model messages, and returns `toUIMessageStreamResponse()`. Tool calling belongs at that exact orchestration point.
   - Alternative considered: creating a separate agent layer first. Rejected for now because it is more invasive than needed.

4. **Allow tools for all provider modes but degrade gracefully when a provider/model does not support tool calling.**
   - Rationale: the user explicitly wants every supporting provider to use tools. The backend should expose the same tool set regardless of provider mode and let the model/provider capability determine whether tool calls are emitted.
   - Alternative considered: restricting tool calling to one provider mode. Rejected because it conflicts with the requested product behavior.

5. **Rewrite the system prompt entirely around source-first documentation assistance.**
   - Rationale: the current prompt is still repository-template centric and actively misguides model behavior for the new docs-console direction.
   - Alternative considered: appending the docs instructions to the old prompt. Rejected because the old prompt’s incentives conflict with the new goal.

6. **Use a safer tool usage pattern: make tools available, but do not force eager fetching.**
   - Rationale: always fetching before answering would increase latency and token usage. The prompt should encourage source-backed answers and explicit tool use when needed, not mandatory prefetching of all sources.
   - Alternative considered: always fetch all five sources on every request. Rejected due to performance and unnecessary cost.

## Risks / Trade-offs

- **Provider capability mismatch** → Some OpenAI-compatible models may not support tool calling. Mitigation: keep the tool available but do not assume it will be used; document this in copy and status behavior.
- **Latency increase from web fetching** → Tool calls will add round-trip time. Mitigation: use the tool only when needed and keep returned payload compact.
- **Prompt drift into unsupported claims** → The model may answer beyond the fetched docs. Mitigation: system prompt should instruct the assistant to distinguish sourced facts from unsupported inference.
- **Large chat route surface area** → `app/api/chat/route.ts` is growing in responsibility. Mitigation: move tool logic into dedicated server helpers and keep the route as orchestration.
- **External fetch reliability** → Some docs endpoints may be slow or return unexpected content. Mitigation: preserve clear tool error messages and continue to support normal non-tool answers.

## Migration Plan

1. Add a server helper for the AI SDK `web-fetch` tool using the existing OpenCode tool as a behavioral reference.
2. Extend `app/api/chat/route.ts` to register the tool in `streamText(...)`.
3. Replace `lib/repo-system-prompt.ts` with a docs-console system prompt focused on the five sources.
4. Update the homepage suggested prompts and empty-state copy to reflect the docs-console product direction.
5. Verify Router/custom mode still work after tool addition, and confirm non-tool-capable models fail gracefully.

Rollback is straightforward:
- remove the server-local tool registration
- restore the previous system prompt
- restore the older suggested prompts and empty-state copy

## Open Questions

- Whether the UI should eventually surface source citations or fetched URLs inline in the message rendering, beyond the backend tool response.
- Whether the docs-console direction should become the dominant visual identity of the homepage, or remain a layered behavior over the existing multi-provider console layout.
