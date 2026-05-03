## 1. Tool UI Default State

- [x] 1.1 Change the local AI Elements `Tool` header behavior so `web-fetch` cards render collapsed by default.
- [x] 1.2 Keep the tool header informative enough that users can tell a tool ran even while collapsed.

## 2. Multi-Step Tool Loop

- [x] 2.1 Update `app/api/chat/route.ts` to enable bounded multi-step tool calling with AI SDK `streamText(...)`.
- [x] 2.2 Ensure successful tool execution can lead to a follow-up assistant answer when the provider supports it.
- [x] 2.3 Keep non-tool-capable provider behavior stable and non-crashing.

## 3. Verification

- [ ] 3.1 Run `pnpm typecheck`.
- [ ] 3.2 Run `pnpm lint`.
- [ ] 3.3 Run `pnpm build`.
- [ ] 3.4 Manually test a normal non-tool response and confirm text-only behavior still works.
- [ ] 3.5 Manually test a tool-capable provider and confirm the tool card starts collapsed.
- [ ] 3.6 Manually test a tool-capable provider and confirm a final assistant answer appears after the `web-fetch` tool result.
