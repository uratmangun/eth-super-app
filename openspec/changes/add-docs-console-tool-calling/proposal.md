## Why

The current homepage has evolved into a multi-provider AI console, but its system prompt, suggested prompts, and tool surface still behave like a template chat shell or a 0G-only playground. The next step is to turn it into a documentation-first research console that can answer questions across multiple ecosystems using source-aware tool calling.

## What Changes

- Replace the repository-template system prompt with a documentation-console system prompt focused on five reference sources: 0G, Uniswap, Gensyn, ENS, and KeeperHub.
- Add AI SDK tool calling to the server chat route using a server-local `web-fetch` tool that mimics the existing OpenCode `web-fetch` behavior.
- Make the `web-fetch` tool available to every provider mode that supports tool calling instead of limiting it to a single backend path.
- Replace 0G-only suggested prompts and empty-state copy with research-oriented prompts that encourage exploration across the supported documentation sources.
- Keep provider selection and model selection intact, but reposition the product as a docs-research console first and a model playground second.
- **BREAKING**: Change the assistant’s default behavior from repository-template guidance to source-first documentation assistance.

## Capabilities

### New Capabilities
- `docs-console-tool-calling`: AI SDK tool-calling behavior and server-local `web-fetch` integration for documentation retrieval.
- `multi-docs-research-console`: Product behavior, prompts, and system guidance for answering across the five supported documentation ecosystems.

### Modified Capabilities
- `zero-g-llm-console`: The homepage chat experience changes from a 0G-first LLM console to a provider-backed docs research console with broader suggested prompts and source-aware behavior.

## Impact

- Affected UI: `components/home-page-client.tsx` suggested prompts, empty-state copy, and status behavior around tool-capable chat.
- Affected chat backend: `app/api/chat/route.ts` gains AI SDK tool calling and new system-prompt intent.
- Affected prompting: `lib/repo-system-prompt.ts` will be replaced or substantially rewritten.
- New server helper(s): a local AI SDK tool implementation for `web-fetch`, likely under `lib/` or a dedicated server-tool module.
- Affected provider behavior: Router, Direct SDK, and custom OpenAI-compatible modes must degrade safely when tool calling is unsupported.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm build`, plus manual chat checks across at least Router and custom provider modes.
