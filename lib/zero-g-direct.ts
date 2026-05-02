import type { JsonRpcSigner } from "ethers";

export type ZeroGDirectService = {
  provider: string;
  serviceType: string;
  url: string;
  model: string;
  inputPrice: string;
  outputPrice: string;
  verifiability: string;
  teeSignerAcknowledged: boolean;
};

export type ZeroGDirectMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ZeroGDirectBroker = {
  inference: {
    getAccount?: (providerAddress: string) => Promise<{ balance?: bigint }>;
    getRequestHeaders: (providerAddress: string, content?: string) => Promise<{ Authorization: string } & Record<string, string | undefined>>;
    getServiceMetadata: (providerAddress: string) => Promise<{ endpoint: string; model: string }>;
    listService: (offset?: number, limit?: number, includeUnacknowledged?: boolean) => Promise<unknown[]>;
    processResponse?: (providerAddress: string, chatID?: string, content?: string) => Promise<boolean | null>;
  };
};

type ZeroGComputeModule = {
  createZGComputeNetworkBroker: (signer: JsonRpcSigner) => Promise<ZeroGDirectBroker>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function getPrice(value: unknown) {
  return typeof value === "bigint" ? value.toString() : String(value ?? "0");
}

export function normalizeZeroGDirectService(service: unknown): ZeroGDirectService | null {
  if (!isRecord(service)) {
    return null;
  }

  const provider = getString(service.provider);
  const serviceType = getString(service.serviceType);
  const model = getString(service.model);

  if (!provider || !serviceType || !model) {
    return null;
  }

  return {
    inputPrice: getPrice(service.inputPrice),
    model,
    outputPrice: getPrice(service.outputPrice),
    provider,
    serviceType,
    teeSignerAcknowledged: getBoolean(service.teeSignerAcknowledged),
    url: getString(service.url),
    verifiability: getString(service.verifiability),
  };
}

export async function createZeroGDirectBroker(signer: JsonRpcSigner) {
  const { createZGComputeNetworkBroker } = (await import("@0gfoundation/0g-compute-ts-sdk")) as unknown as ZeroGComputeModule;

  return createZGComputeNetworkBroker(signer);
}

export async function listZeroGDirectChatbotServices(broker: ZeroGDirectBroker) {
  const services = await broker.inference.listService(0, 50, true);

  return services
    .map(normalizeZeroGDirectService)
    .filter((service): service is ZeroGDirectService => Boolean(service))
    .filter((service) => service.serviceType.toLowerCase().includes("chat"));
}

export async function getZeroGDirectProviderBalance(broker: ZeroGDirectBroker, providerAddress: string) {
  if (!broker.inference.getAccount) {
    return null;
  }

  const account = await broker.inference.getAccount(providerAddress);

  return account.balance ?? null;
}

export async function sendZeroGDirectChatCompletion({
  broker,
  messages,
  model,
  providerAddress,
}: {
  broker: ZeroGDirectBroker;
  messages: ZeroGDirectMessage[];
  model?: string;
  providerAddress: string;
}) {
  const content = messages.at(-1)?.content ?? "";
  const [metadata, headers] = await Promise.all([
    broker.inference.getServiceMetadata(providerAddress),
    broker.inference.getRequestHeaders(providerAddress, content),
  ]);
  const selectedModel = model ?? metadata.model;
  const response = await fetch(`${metadata.endpoint.replace(/\/$/, "")}/chat/completions`, {
    body: JSON.stringify({ messages, model: selectedModel }),
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `0G Direct provider returned ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    chatID?: string;
    id?: string;
  };
  const assistantContent = data.choices?.[0]?.message?.content;

  if (!assistantContent) {
    throw new Error("0G Direct response did not include assistant content.");
  }

  const chatID = response.headers.get("ZG-Res-Key") ?? response.headers.get("zg-res-key") ?? data.chatID ?? data.id;
  const verified = chatID && broker.inference.processResponse ? await broker.inference.processResponse(providerAddress, chatID, assistantContent) : null;

  return {
    content: assistantContent,
    metadata: { endpoint: metadata.endpoint, model: selectedModel },
    verified,
  };
}
