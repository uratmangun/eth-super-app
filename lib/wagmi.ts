import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";

import { zeroGChains, zeroGMainnet, zeroGTestnet } from "@/lib/chains";

export const wagmiConfig = createConfig({
  chains: zeroGChains,
  ssr: true,
  transports: {
    [zeroGTestnet.id]: http(zeroGTestnet.rpcUrls.default.http[0]),
    [zeroGMainnet.id]: http(zeroGMainnet.rpcUrls.default.http[0]),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
