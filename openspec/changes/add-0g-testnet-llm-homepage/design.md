## Context

The app is a Next.js App Router project with a client homepage in `components/home-page-client.tsx`, global Tailwind/shadcn theme tokens in `app/globals.css`, and app-level providers in `app/layout.tsx`. The current homepage is a dark template landing page plus OpenAI-compatible chat settings. The approved direction is a light-blue 0G Galileo testnet LLM console based on `design/home-0g-ai-console.pen` and `design/bi8Au.png`.

The 0G docs identify Galileo testnet with RPC `https://evmrpc-testnet.0g.ai`, token `0G`, and primary chain ID `16602`, but one MetaMask snippet conflicts by using hex `0x40EA`. Implementation must verify the live RPC `eth_chainId` before locking the chain behavior. The user has chosen 0G Direct SDK wallet flow, injected/MetaMask connectors only, and keeping the chatbox as the primary interaction model.

## Goals / Non-Goals

**Goals:**
- Replace template-specific homepage messaging with a light-blue 0G Galileo LLM console matching the Pencil mockup.
- Preserve a chatbox-centered interaction model for prompts and responses.
- Add wagmi and TanStack Query app providers with only injected and MetaMask connectors.
- Support wallet connection, disconnect, account display, wrong-chain handling, and switching/adding 0G Galileo.
- Use 0G Direct SDK with a wallet-backed ethers signer for provider discovery, metadata, request headers, chat completions, and optional response verification.
- Show useful readiness states before inference: disconnected wallet, wrong chain, provider pending, funding needed, request loading, and request error.

**Non-Goals:**
- Do not implement WalletConnect in this change.
- Do not implement 0G Router API key flow in this change.
- Do not keep the GitHub clone helper, template promo card, or repository assistant copy.
- Do not add unrelated storage, DA, INFT, or smart contract deployment features.
- Do not make persisted server-side user accounts or databases.

## Decisions

1. **Use 0G Direct SDK as the LLM path.**
   - Rationale: The requested behavior is wallet-first and chain-connected. Direct SDK uses a wallet signer to generate request headers and manage provider-specific compute access.
   - Alternative considered: Router API key flow through `https://router-api.0g.ai/v1`. It is simpler and fits OpenAI-compatible server routes, but it does not satisfy the wallet-signed dApp direction.

2. **Use wagmi with injected and MetaMask connectors only.**
   - Rationale: This matches the requested first version and avoids WalletConnect project ID setup.
   - Alternative considered: Add WalletConnect now. It adds configuration and UX scope that the user explicitly deferred.

3. **Add a client provider wrapper instead of putting wagmi directly in `app/layout.tsx`.**
   - Rationale: `WagmiProvider` and `QueryClientProvider` are client-side providers. A focused `components/providers.tsx` keeps `app/layout.tsx` as a server component and preserves the existing tooltip provider behavior.

4. **Create focused helper modules for chain, wagmi, ethers adapter, and 0G compute.**
   - Rationale: `components/home-page-client.tsx` is already large. Small helpers keep wallet/compute behavior testable and avoid burying network logic in UI markup.

5. **Verify 0G testnet chain ID before final chain behavior.**
   - Rationale: Official docs conflict between `16602` and `0x40EA`. Implementation should query the RPC once during development and document the chosen value in code comments only if needed.

6. **Keep the existing chatbox pattern but replace provider settings with 0G readiness controls.**
   - Rationale: The approved mockup keeps chat as the core interaction surface. 0G-specific readiness states should surround the chatbox rather than replace it with a generic dashboard.

## Risks / Trade-offs

- **0G SDK browser compatibility risk** → Mitigation: integrate minimally first, typecheck/build early, and avoid optional SDK features until the core provider listing and chat request path works.
- **Chain ID documentation conflict** → Mitigation: run an RPC `eth_chainId` check during implementation and configure wagmi from the verified result.
- **Funding flow complexity** → Mitigation: first surface clear no-funds/funding-needed states and minimal actions; avoid building a full account management dashboard.
- **Large homepage component risk** → Mitigation: split wallet and compute readiness UI into focused components while preserving existing app patterns.
- **Direct SDK request failures from providers** → Mitigation: expose inline errors in the chat console and keep request state visible.
- **No WalletConnect support** → Trade-off accepted by user for first version; mobile wallet coverage is intentionally deferred.

## Migration Plan

1. Generate and review Pencil design artifacts first; do not implement app code until the visual direction is approved.
2. Install dependencies and add providers/helpers in small commits.
3. Replace homepage UI with the approved light-blue console shell.
4. Wire wallet and chain readiness.
5. Wire 0G Direct Compute provider discovery and chat submission.
6. Verify with lint, typecheck, build, and manual wallet testing.

Rollback is straightforward because this is a frontend/client integration change: revert the dependency additions and the modified/new app files to return to the current OpenAI-compatible template chat page.

## Open Questions

- The live 0G Galileo chain ID must be verified from `https://evmrpc-testnet.0g.ai` before implementation finalizes `lib/chains.ts`.
- The exact provider selection UX may need revision after seeing `broker.inference.listService()` output shape and available testnet providers.
