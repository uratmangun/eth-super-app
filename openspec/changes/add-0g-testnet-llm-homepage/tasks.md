## 1. Design Readiness

- [x] 1.1 Review `design/bi8Au.png` and confirm the light-blue 0G LLM console mockup is approved for implementation.
- [x] 1.2 If revisions are requested, update `design/home-0g-ai-console.pen`, export a new PNG, and re-review before touching app code.

## 2. Dependency and Chain Setup

- [x] 2.1 Verify the live 0G Galileo chain ID from `https://evmrpc-testnet.0g.ai` with `eth_chainId` and record the chosen value in implementation notes.
- [x] 2.2 Install `wagmi`, `viem@2.x`, `@tanstack/react-query`, `ethers`, and `@0gfoundation/0g-compute-ts-sdk` with pnpm.
- [x] 2.3 Add `lib/chains.ts` with the verified `zeroGTestnet` chain definition.
- [x] 2.4 Add `lib/wagmi.ts` with wagmi config using `ssr: true`, 0G RPC transport, `injected()`, and `metaMask()` only.
- [x] 2.5 Add an ethers signer adapter for wagmi connector clients.

## 3. App Providers

- [x] 3.1 Create a client provider component that wraps `WagmiProvider`, `QueryClientProvider`, and the existing `TooltipProvider`.
- [x] 3.2 Update `app/layout.tsx` to use the new provider component while keeping layout metadata and fonts intact.
- [x] 3.3 Run typecheck to verify provider setup compiles before UI integration.

## 4. Wallet and Chain Readiness UI

- [x] 4.1 Add wallet connection UI for injected and MetaMask connectors only.
- [x] 4.2 Show disconnected, connecting, connected, and disconnect states with shortened account address display.
- [x] 4.3 Add 0G Galileo chain status UI for correct-chain and wrong-chain states.
- [x] 4.4 Add a switch/add-chain action for wrong-network wallet state.
- [x] 4.5 Ensure WalletConnect is not rendered or configured anywhere in this first version.

## 5. 0G Direct Compute Integration

- [x] 5.1 Add a focused 0G compute helper or hook that initializes `createZGComputeNetworkBroker` from the wallet-backed ethers signer.
- [x] 5.2 Add provider discovery for chatbot inference services after broker initialization.
- [x] 5.3 Add selected provider/model metadata state for the compute readiness UI.
- [x] 5.4 Add request header generation through the Direct SDK before sending prompts.
- [x] 5.5 Add chat completion request handling against the selected provider endpoint.
- [x] 5.6 Add optional response verification status when provider response data supports it.
- [x] 5.7 Add inline error states for broker initialization, provider discovery, request headers, and inference failures.

## 6. Homepage Redesign

- [x] 6.1 Remove the current template promo card, clone command, repository assistant title, provider settings dialog, and template/deploy prompt copy from `components/home-page-client.tsx`.
- [x] 6.2 Rebuild the homepage shell to match the approved light-blue Pencil mockup.
- [x] 6.3 Keep the chatbox as the primary prompt and response surface.
- [x] 6.4 Add wallet, chain, provider/model, and funding readiness panels around the chatbox.
- [x] 6.5 Replace suggested prompts with 0G-specific prompts for provider balance, model comparison, and inference readiness.
- [x] 6.6 Add loading, empty, blocked-readiness, and error states in the chat console.
- [x] 6.7 Update `app/globals.css` theme tokens/backgrounds for the light-blue console while preserving accessible contrast.

## 7. Verification

- [x] 7.1 Run `pnpm lint` and fix any issues from changed files.
- [x] 7.2 Run `pnpm typecheck` and fix any TypeScript issues.
- [x] 7.3 Run `pnpm build` and fix any build/runtime bundling issues.
- [ ] 7.4 Manually test wallet connection with injected or MetaMask wallet.
- [ ] 7.5 Manually test wrong-network handling and switch/add 0G Galileo flow.
- [ ] 7.6 Manually test provider discovery and no-provider or funding-needed states.
- [ ] 7.7 Manually test a 0G Direct Compute chat prompt when testnet wallet/provider funding is available.
