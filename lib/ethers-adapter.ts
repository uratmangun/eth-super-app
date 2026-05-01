import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Account, Chain, Client, Transport } from "viem";

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    ensAddress: chain.contracts?.ensRegistry?.address,
    name: chain.name,
  };
  const provider = new BrowserProvider(transport, network);

  return new JsonRpcSigner(provider, account.address);
}
