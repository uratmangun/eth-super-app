## 1. Aleo Pattern Extraction

- [x] 1.1 Extract the relevant AI SDK tool-calling patterns from `/home/uratmangun/CascadeProjects/aleo-super-app`.
- [x] 1.2 Identify which pieces should be copied directly and which are Aleo-specific and must be excluded.

## 2. Chat State / Transport Alignment

- [x] 2.1 Align this app’s chat state more closely with AI SDK-native message/tool handling.
- [x] 2.2 Reduce or replace brittle manual SSE parsing where the Aleo-style message flow provides a better fit.
- [x] 2.3 Preserve tool rendering compatibility in the existing UI.

## 3. Provider Configuration Alignment

- [x] 3.1 Ensure env-backed default provider config still works.
- [x] 3.2 Ensure request-scoped custom `baseURL` and `apiKey` overrides continue to work for custom OpenAI-compatible mode.
- [x] 3.3 Ensure tool calling does not appear to require env-only provider configuration when a valid custom provider request is supplied.

## 4. Verification

- [ ] 4.1 Run `pnpm typecheck`.
- [ ] 4.2 Run `pnpm lint`.
- [ ] 4.3 Run `pnpm build`.
- [ ] 4.4 Manually test a tool-capable custom provider and confirm the tool loop behaves at least as reliably as the Aleo reference pattern.
