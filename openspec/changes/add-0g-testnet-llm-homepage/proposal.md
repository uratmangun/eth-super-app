## Why

The current homepage still presents the project as a generic AI IDE template with clone/deploy copy, but the product direction has shifted to a wallet-connected 0G Galileo testnet LLM console. Users need a clear chat-first interface that prepares them to connect MetaMask or an injected wallet, switch to 0G Galileo, and use 0G Direct Compute for inference.

## What Changes

- Remove the existing template promo card, clone command, and repository assistant framing from the homepage.
- Redesign the homepage as a light-blue 0G testnet LLM console based on the approved Pencil mockup in `design/home-0g-ai-console.pen`.
- Keep the chatbox as the primary user interaction surface for future 0G LLM prompts.
- Add wallet, chain, provider/model, funding, loading, empty, and error states around the chatbox.
- Add wagmi with injected and MetaMask connectors only.
- Add 0G Galileo testnet chain configuration and verify the live RPC chain ID before finalizing implementation behavior.
- Integrate 0G Direct SDK wallet-signed inference flow, including provider discovery, metadata, request headers, chat completion calls, and optional response verification.
- Do not use Router API key flow or WalletConnect in the first implementation.

## Capabilities

### New Capabilities
- `zero-g-llm-console`: Homepage behavior for a wallet-connected 0G Galileo LLM console using the chatbox as the primary prompt surface.
- `zero-g-wallet-compute`: Wallet, chain, and 0G Direct Compute readiness behavior required before prompts can be sent.

### Modified Capabilities
- None.

## Impact

- Affected UI: `components/home-page-client.tsx`, `app/globals.css`, potentially new focused client components under `components/`.
- Affected app shell: `app/layout.tsx` and a new client provider wrapper for wagmi and TanStack Query.
- Affected libraries: new chain/wagmi/0G compute helpers under `lib/`.
- New dependencies: `wagmi`, `viem@2.x`, `@tanstack/react-query`, `ethers`, `@0gfoundation/0g-compute-ts-sdk`.
- Verification: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and manual wallet/browser testing on 0G Galileo testnet.
