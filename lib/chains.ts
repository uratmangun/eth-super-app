import { defineChain } from "viem";

export const zeroGTestnet = defineChain({
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "0G",
    symbol: "0G",
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Galileo ChainScan",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
});

export const zeroGMainnet = defineChain({
  id: 16661,
  name: "0G Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "0G",
    symbol: "0G",
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G ChainScan",
      url: "https://chainscan.0g.ai",
    },
  },
});

export const zeroGChains = [zeroGTestnet, zeroGMainnet] as const;

export const ZERO_G_TESTNET_RPC_URL = zeroGTestnet.rpcUrls.default.http[0];
export const ZERO_G_MAINNET_RPC_URL = zeroGMainnet.rpcUrls.default.http[0];
