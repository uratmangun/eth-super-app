"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { useState, type ReactNode } from "react";
import { WagmiProvider as BaseWagmiProvider } from "wagmi";

import { TooltipProvider } from "@/components/ui/tooltip";
import { zeroGChains, zeroGTestnet } from "@/lib/chains";
import { wagmiConfig } from "@/lib/wagmi";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const baseApp = (
    <QueryClientProvider client={queryClient}>
      <BaseWagmiProvider config={wagmiConfig}>
        <TooltipProvider>{children}</TooltipProvider>
      </BaseWagmiProvider>
    </QueryClientProvider>
  );

  if (!privyAppId) {
    return baseApp;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          accentColor: "#0EA5E9",
          theme: "light",
        },
        defaultChain: zeroGTestnet,
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          showWalletUIs: true,
        },
        loginMethods: ["email", "wallet", "google", "passkey"],
        supportedChains: [...zeroGChains],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={wagmiConfig}>
          <TooltipProvider>{children}</TooltipProvider>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
