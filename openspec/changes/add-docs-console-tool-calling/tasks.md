## 1. Server Tooling

- [x] 1.1 Add a server-local AI SDK `web-fetch` tool helper that mirrors the behavior of `/home/uratmangun/.config/opencode/tools/web-fetch.ts`.
- [x] 1.2 Support direct local fetches for localhost URLs and browser-backed fetches for external URLs.
- [x] 1.3 Return structured tool output including requested URL, final URL, title, output path, HTML length, and text preview.

## 2. Chat Route Tool Calling

- [x] 2.1 Update `app/api/chat/route.ts` to register the `web-fetch` tool with AI SDK `streamText(...)`.
- [x] 2.2 Keep tool registration compatible with Router and custom OpenAI-compatible provider modes.
- [x] 2.3 Verify non-tool-capable providers degrade gracefully without breaking chat responses.

## 3. System Prompt Migration

- [x] 3.1 Replace the current repository-template system prompt in `lib/repo-system-prompt.ts`.
- [x] 3.2 Rewrite the default system prompt to focus on these five sources:
- [x] 3.2.1 0G: `https://docs.0g.ai/ai-context.md`
- [x] 3.2.2 Uniswap: `https://developers.uniswap.org/docs/uniswap-ai/llms.txt`
- [x] 3.2.3 Gensyn: `https://docs.gensyn.ai/tech/agent-exchange-layer.md`
- [x] 3.2.4 ENS: `https://docs.ens.domains/llms.txt`
- [x] 3.2.5 KeeperHub: `https://docs.keeperhub.com/`
- [x] 3.3 Instruct the assistant to prefer source-backed answers and to acknowledge when a claim is unsupported by the available documentation.

## 4. Homepage Prompting UX

- [x] 4.1 Replace the current 0G-only suggested prompts in `components/home-page-client.tsx`.
- [x] 4.2 Update the empty-state title and description to frame the app as a docs research console.
- [x] 4.3 Ensure the suggested prompts span the five supported documentation ecosystems.

## 5. Verification

- [x] 5.1 Run `pnpm typecheck`.
- [x] 5.2 Run `pnpm lint`.
- [x] 5.3 Run `pnpm build`.
- [x] 5.4 Manually test Router mode with a docs-focused prompt and confirm normal chat still works.
- [x] 5.5 Manually test custom provider mode with a docs-focused prompt and confirm normal chat still works.
- [x] 5.6 Manually test at least one tool-capable provider/model and verify `web-fetch` is invoked successfully.
