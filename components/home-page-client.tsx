"use client";

import {
  AlertCircleIcon,
  BotIcon,
  ClipboardCheckIcon,
  CopyIcon,
  LogOutIcon,
  SaveIcon,
  WalletIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFundWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { formatUnits } from "viem";
import { useBalance, useConnect, useConnection, useConnectorClient, useConnectors, useDisconnect } from "wagmi";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { zeroGChains, zeroGTestnet } from "@/lib/chains";
import { clientToSigner } from "@/lib/ethers-adapter";
import type { UiModel } from "@/lib/models";
import { cn } from "@/lib/utils";
import {
  createZeroGDirectBroker,
  getZeroGDirectProviderBalance,
  listZeroGDirectChatbotServices,
  sendZeroGDirectChatCompletion,
  type ZeroGDirectMessage,
  type ZeroGDirectService,
} from "@/lib/zero-g-direct";

type ProviderMode = "0g-router-testnet" | "0g-direct" | "custom-openai";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type RouterBalance = {
  address: string;
  depositBalanceZeroG: string;
  totalBalanceZeroG: string;
};

type CustomProviderConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
};

type WalletState = {
  authenticated: boolean;
  effectiveAddress?: string;
  exportWallet?: (address?: string) => void;
  fundWallet?: (address: string, chainId: number) => void;
  hasPrivy: boolean;
  isWalletReady: boolean;
  loginWithPrivy: () => void;
  logoutWallet: () => void;
};

type LoginMode = {
  buttonLabel: string;
  buttonDisabled?: boolean;
  helperMessage?: string;
  secondaryConnectors: ReturnType<typeof useConnectors>;
  showPrivy: boolean;
};

const customProviderStorageKey = "eth-super-app.custom-openai-provider";
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const providerLabels: Record<ProviderMode, string> = {
  "0g-direct": "0G Direct SDK",
  "0g-router-testnet": "0G Router Testnet",
  "custom-openai": "Custom OpenAI-compatible",
};

const suggestedPrompts = [
  "Explain the difference between Router and Direct 0G Compute.",
  "List the live chatbot models available in this provider mode.",
  "Write a hello-world prompt for the selected model.",
  "What balance or API key setup does this provider mode require?",
];

function shortAddress(address?: string) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatZeroG(value: bigint | null) {
  if (value === null) {
    return "Not checked";
  }

  const base = BigInt(10) ** BigInt(18);
  const precision = BigInt(10) ** BigInt(14);
  const whole = value / base;
  const decimals = ((value % base) / precision).toString().padStart(4, "0").replace(/0+$/, "");

  return `${whole.toString()}${decimals ? `.${decimals}` : ""} 0G`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function extractAssistantTextFromUIMessageStream(streamText: string) {
  const chunks = streamText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");

  let assistantText = "";

  for (const chunk of chunks) {
    try {
      const payload = JSON.parse(chunk) as { delta?: string; type?: string };

      if (payload.type === "text-delta" && typeof payload.delta === "string") {
        assistantText += payload.delta;
      }
    } catch {
      continue;
    }
  }

  return assistantText.trim();
}

function loadSavedCustomProvider(): CustomProviderConfig {
  if (typeof window === "undefined") {
    return { apiKey: "", baseURL: "", model: "" };
  }

  const raw = window.localStorage.getItem(customProviderStorageKey);
  if (!raw) {
    return { apiKey: "", baseURL: "", model: "" };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CustomProviderConfig>;
    return {
      apiKey: parsed.apiKey ?? "",
      baseURL: parsed.baseURL ?? "",
      model: parsed.model ?? "",
    };
  } catch {
    return { apiKey: "", baseURL: "", model: "" };
  }
}

function StatusDot({ tone }: { tone: "blue" | "green" | "amber" | "slate" | "red" }) {
  return (
    <span
      className={cn(
        "size-2.5 rounded-full",
        tone === "blue" && "bg-sky-500",
        tone === "green" && "bg-emerald-500",
        tone === "amber" && "bg-amber-500",
        tone === "slate" && "bg-slate-400",
        tone === "red" && "bg-rose-500",
      )}
    />
  );
}

function ReadinessCard({
  children,
  className,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Card className={cn("rounded-[2rem] border-sky-200/80 bg-white/80 p-5 shadow-[0_24px_60px_-40px_rgba(14,116,144,0.45)] md:p-6", className)}>
      <CardHeader className="gap-3 p-0 pb-3">
        <Badge className="w-fit border-sky-200 bg-sky-50 font-mono text-[0.7rem] font-semibold uppercase tracking-wide text-sky-700" variant="outline">
          {eyebrow}
        </Badge>
        <CardTitle className="text-2xl tracking-tight text-slate-950">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 text-sm leading-6 text-slate-600">{children}</CardContent>
    </Card>
  );
}

function StatusLine({
  kind,
  text,
}: {
  kind: "loading" | "ready" | "error";
  text: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-mono text-xs",
        kind === "loading" && "text-sky-700",
        kind === "ready" && "text-slate-500",
        kind === "error" && "text-rose-600",
      )}
    >
      <span
        className={cn(
          "inline-block size-2 rounded-full",
          kind === "loading" && "animate-pulse bg-sky-500",
          kind === "ready" && "bg-emerald-500",
          kind === "error" && "bg-rose-500",
        )}
      />
      {text}
    </div>
  );
}

function HomePageContent({ loginMode, walletState }: { loginMode: LoginMode; walletState: WalletState }) {
  const connection = useConnection();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: connectorClient } = useConnectorClient({ chainId: zeroGTestnet.id });

  const [providerMode, setProviderMode] = useState<ProviderMode>("0g-router-testnet");
  const [selectedChainId, setSelectedChainId] = useState<number>(zeroGTestnet.id);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [modelsConfigured, setModelsConfigured] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [routerModels, setRouterModels] = useState<UiModel[]>([]);
  const [customModels, setCustomModels] = useState<UiModel[]>([]);
  const [directServices, setDirectServices] = useState<ZeroGDirectService[]>([]);
  const [directBroker, setDirectBroker] = useState<Awaited<ReturnType<typeof createZeroGDirectBroker>> | null>(null);
  const [directBalance, setDirectBalance] = useState<bigint | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [customProvider, setCustomProvider] = useState<CustomProviderConfig>(() => loadSavedCustomProvider());
  const [requestError, setRequestError] = useState<string | null>(null);
  const [routerBalance, setRouterBalance] = useState<RouterBalance | null>(null);
  const [routerBalanceMessage, setRouterBalanceMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const hasBootstrappedRouterRef = useRef(false);

  const effectiveAddress = walletState.effectiveAddress ?? connection.address;
  const isWalletReady = walletState.isWalletReady || Boolean(connection.address);
  const selectedChain = zeroGChains.find((chain) => chain.id === selectedChainId) ?? zeroGTestnet;
  const walletBalance = useBalance({
    address: effectiveAddress as `0x${string}` | undefined,
    chainId: selectedChain.id,
    query: {
      enabled: Boolean(effectiveAddress),
    },
  });

  const activeModels = useMemo(() => {
    if (providerMode === "custom-openai") {
      return customModels.filter((model) => model.type === "chatbot" || model.type === "unknown");
    }

    if (providerMode === "0g-direct") {
      return directServices.map((service) => ({
        contextLength: undefined,
        id: service.model,
        maxCompletionTokens: undefined,
        name: service.model,
        provider: "0g-direct",
        providerCount: undefined,
        providerLabel: shortAddress(service.provider),
        type: "chatbot",
      } satisfies UiModel));
    }

    return routerModels.filter((model) => model.type === "chatbot");
  }, [customModels, directServices, providerMode, routerModels]);

  const currentModel = activeModels.some((model) => model.id === selectedModel)
    ? selectedModel
    : customProvider.model || activeModels[0]?.id || "";
  const selectedDirectService =
    providerMode === "0g-direct"
      ? directServices.find((service) => service.model === currentModel) ?? directServices[0] ?? null
      : null;
  const formattedWalletBalance = walletBalance.data
    ? `${formatUnits(walletBalance.data.value, walletBalance.data.decimals)} ${walletBalance.data.symbol}`
    : null;

  const loadServerModels = useCallback(
    async (mode: "0g-router-testnet" | "custom-openai") => {
      setModelsLoading(true);
      setModelsError(null);

      try {
        const response = await fetch("/api/models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: mode === "custom-openai" ? customProvider.apiKey : undefined,
            baseURL: mode === "custom-openai" ? customProvider.baseURL : undefined,
            providerMode: mode,
          }),
        });

        if (!response.ok) {
          throw new Error(`Model request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          configured: boolean;
          data: UiModel[];
          message: string | null;
        };

        setModelsConfigured(payload.configured);
        setModelsError(payload.message);

        if (mode === "custom-openai") {
          setCustomModels(payload.data ?? []);
        } else {
          setRouterModels(payload.data ?? []);
        }
      } catch (error) {
        setModelsConfigured(false);
        setModelsError(getErrorMessage(error));

        if (mode === "custom-openai") {
          setCustomModels([]);
        } else {
          setRouterModels([]);
        }
      } finally {
        setModelsLoading(false);
      }
    },
    [customProvider.apiKey, customProvider.baseURL],
  );

  const loadRouterBalance = useCallback(async () => {
    try {
      const response = await fetch("/api/router-balance", { cache: "no-store" });
      const payload = (await response.json()) as {
        configured: boolean;
        data: RouterBalance | null;
        message: string | null;
      };
      setRouterBalance(payload.data);
      setRouterBalanceMessage(payload.message);
    } catch (error) {
      setRouterBalance(null);
      setRouterBalanceMessage(getErrorMessage(error));
    }
  }, []);

  const loadDirectServices = useCallback(async () => {
    if (!connectorClient || !isWalletReady || selectedChain.id !== zeroGTestnet.id) {
      setDirectServices([]);
      setDirectBroker(null);
      setDirectBalance(null);
      setDirectError("Connect a wallet on 0G Galileo testnet to load Direct SDK services.");
      return;
    }

    setModelsLoading(true);
    setDirectError(null);

    try {
      const broker = await createZeroGDirectBroker(clientToSigner(connectorClient));
      const services = await listZeroGDirectChatbotServices(broker);
      const selectedService = services[0] ?? null;
      const balance = selectedService
        ? await getZeroGDirectProviderBalance(broker, selectedService.provider).catch(() => null)
        : null;

      setDirectBroker(broker);
      setDirectServices(services);
      setDirectBalance(balance);
      setModelsConfigured(true);
    } catch (error) {
      setDirectBroker(null);
      setDirectServices([]);
      setDirectBalance(null);
      setDirectError(getErrorMessage(error));
      setModelsConfigured(false);
    } finally {
      setModelsLoading(false);
    }
  }, [connectorClient, isWalletReady, selectedChain.id]);

  useEffect(() => {
    if (hasBootstrappedRouterRef.current) {
      return;
    }

    hasBootstrappedRouterRef.current = true;

    setTimeout(() => {
      void loadRouterBalance();
      void loadServerModels("0g-router-testnet");
    }, 0);
  }, [loadRouterBalance, loadServerModels]);

  const blockingReason = useMemo(() => {
    if (providerMode === "0g-direct") {
      if (!isWalletReady) {
        return "Connect a Privy wallet before using 0G Direct SDK mode.";
      }

      if (selectedChain.id !== zeroGTestnet.id) {
        return "Direct SDK mode currently targets 0G Galileo testnet. Switch the chain selector to Galileo.";
      }

      if (directError) {
        return directError;
      }

      if (!directBroker || !selectedDirectService) {
        return "Load a Direct chatbot provider before sending prompts.";
      }

      return null;
    }

    if (providerMode === "custom-openai") {
      if (!customProvider.baseURL.trim()) {
        return "Add a valid custom OpenAI-compatible base URL before sending prompts.";
      }

      if (modelsLoading) {
        return "Loading models for the selected provider mode.";
      }

      if (!currentModel) {
        return "No model selected. Load models from the custom endpoint or enter a fallback model in the custom provider settings.";
      }

      return null;
    }

    if (!modelsConfigured) {
      return "Set ZERO_G_ROUTER_API_KEY in .env.local to enable 0G Router testnet chat and model loading.";
    }

    if (modelsLoading) {
      return "Loading models for the selected provider mode.";
    }

    if (modelsError) {
      return modelsError;
    }

    if (!currentModel) {
      return "No chatbot models are available for the selected provider mode.";
    }

    return null;
  }, [currentModel, customProvider.baseURL, directBroker, directError, isWalletReady, modelsConfigured, modelsError, modelsLoading, providerMode, selectedChain.id, selectedDirectService]);

  const handleCopyAddress = useCallback(async () => {
    if (!effectiveAddress) {
      return;
    }

    await navigator.clipboard.writeText(effectiveAddress);
    setCopiedAddress(true);
    window.setTimeout(() => setCopiedAddress(false), 1600);
  }, [effectiveAddress]);

  const handleSaveCustomProvider = useCallback(() => {
    window.localStorage.setItem(customProviderStorageKey, JSON.stringify(customProvider));
  }, [customProvider]);

  const handleSubmitPrompt = useCallback(
    async ({ text }: { text: string }) => {
      const content = text.trim();

      if (!content || isSending) {
        return;
      }

      if (blockingReason || !currentModel) {
        setRequestError(blockingReason ?? "Selected provider is not ready.");
        return;
      }

      const userMessage: ChatMessage = {
        content,
        id: crypto.randomUUID(),
        role: "user",
      };
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setIsSending(true);
      setRequestError(null);

      try {
        if (providerMode === "0g-direct") {
          if (!directBroker || !selectedDirectService) {
            throw new Error("Direct SDK provider is not ready.");
          }

          const directMessages: ZeroGDirectMessage[] = nextMessages.map((message) => ({
            content: message.content,
            role: message.role,
          }));
          const result = await sendZeroGDirectChatCompletion({
            broker: directBroker,
            messages: directMessages,
            model: currentModel,
            providerAddress: selectedDirectService.provider,
          });

          setMessages((current) => [...current, { content: result.content, id: crypto.randomUUID(), role: "assistant" }]);
          return;
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: providerMode === "custom-openai" ? customProvider.apiKey : undefined,
            baseURL: providerMode === "custom-openai" ? customProvider.baseURL : undefined,
            messages: nextMessages.map((message) => ({
              id: message.id,
              parts: [{ text: message.content, type: "text" }],
              role: message.role,
            })),
            model: currentModel,
            providerMode,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || `Chat request failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response stream was empty.");
        }

        const decoder = new TextDecoder();
        let aggregated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          aggregated += decoder.decode(value, { stream: true });
        }

        const assistantText = extractAssistantTextFromUIMessageStream(aggregated);

        if (!assistantText) {
          throw new Error("Provider did not return assistant text.");
        }

        setMessages((current) => [...current, { content: assistantText, id: crypto.randomUUID(), role: "assistant" }]);
      } catch (error) {
        setRequestError(getErrorMessage(error));
      } finally {
        setIsSending(false);
      }
    },
    [blockingReason, currentModel, customProvider.apiKey, customProvider.baseURL, directBroker, isSending, messages, providerMode, selectedDirectService],
  );

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(186,230,253,0.95),transparent_32%),radial-gradient(circle_at_84%_4%,rgba(14,165,233,0.18),transparent_30%),linear-gradient(180deg,#eaf7ff_0%,#dff3ff_100%)] px-4 py-5 text-slate-950 md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.34)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-7">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-sky-200 bg-white/70 p-4 shadow-[0_24px_70px_-48px_rgba(14,116,144,0.55)] backdrop-blur md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500 font-mono text-base font-bold text-white shadow-[0_18px_38px_-24px_rgba(2,132,199,0.85)]">0G</div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">0G AI Console</h1>
              <p className="text-sm text-slate-600 md:text-base">Router, Direct SDK, and custom OpenAI-compatible inference</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={(value) => setProviderMode(value as ProviderMode)} value={providerMode}>
              <SelectTrigger className="rounded-full border-sky-200 bg-sky-50 px-3 py-2 font-mono text-xs text-sky-950 shadow-none">
                <span>{providerLabels[providerMode]}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(providerLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setSelectedChainId(Number(value))} value={String(selectedChain.id)}>
              <SelectTrigger className="rounded-full border-sky-200 bg-sky-50 px-3 py-2 font-mono text-xs text-sky-950 shadow-none">
                <span>{selectedChain.name}</span>
              </SelectTrigger>
              <SelectContent>
                {zeroGChains.map((chain) => (
                  <SelectItem key={chain.id} value={String(chain.id)}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isWalletReady ? (
              <>
                <Button className="rounded-full bg-sky-500 px-4 text-white hover:bg-sky-600" onClick={() => (walletState.authenticated ? walletState.logoutWallet() : disconnect())}>
                  <LogOutIcon className="size-4" />
                  {shortAddress(effectiveAddress)}
                </Button>
                <Button className="rounded-full border-sky-200 bg-white/70 px-3 text-sky-950 hover:bg-sky-50" onClick={handleCopyAddress} variant="outline">
                  {copiedAddress ? <ClipboardCheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                  {copiedAddress ? "Copied" : "Copy"}
                </Button>
              </>
            ) : (
              <Button
                className="rounded-full bg-sky-500 px-4 text-white hover:bg-sky-600"
                disabled={loginMode.buttonDisabled ?? (loginMode.showPrivy && !walletState.hasPrivy)}
                onClick={() => {
                  if (loginMode.showPrivy) {
                    walletState.loginWithPrivy();
                    return;
                  }

                  const firstConnector = loginMode.secondaryConnectors[0];
                  if (firstConnector) {
                    connect({ connector: firstConnector });
                  }
                }}
              >
                <WalletIcon className="size-4" />
                {loginMode.buttonLabel}
              </Button>
            )}
            {!isWalletReady && loginMode.helperMessage ? <span className="text-xs text-slate-500">{loginMode.helperMessage}</span> : null}
          </div>
        </header>

        <section className="grid gap-7 lg:grid-cols-[0.72fr_1.55fr] lg:items-start">
          <aside className="flex flex-col gap-6 py-4 lg:py-12">
            <Badge className="w-fit gap-2 rounded-full border-sky-200 bg-white/70 px-3 py-2 font-mono text-xs text-sky-800" variant="outline">
              <StatusDot tone="blue" />
              {providerLabels[providerMode]}
            </Badge>
            <div className="space-y-5">
              <h2 className="max-w-[9ch] text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-7xl">Choose your inference rail.</h2>
              <p className="max-w-xl text-lg leading-8 text-slate-600">Use the shared 0G Router, wallet-signed Direct providers, or your own OpenAI-compatible endpoint without changing the chat surface.</p>
            </div>
          </aside>

          <Card className="overflow-hidden rounded-[2.5rem] border-sky-200 bg-white/90 p-0 shadow-[0_38px_90px_-46px_rgba(14,116,144,0.55)] backdrop-blur">
            <CardHeader className="border-b border-sky-100 bg-white/65 px-6 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl tracking-tight text-slate-950">Multi-provider Chatbox</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">The model selector stays visible and follows the selected provider mode.</p>
                </div>
                <Badge className="w-fit max-w-full gap-2 rounded-full border-sky-200 bg-sky-50 px-3 py-2 font-mono text-xs text-slate-800" variant="outline">
                  <StatusDot tone={activeModels.length > 0 ? "green" : modelsLoading ? "amber" : "red"} />
                  <span className="max-w-full break-all">{currentModel || "No model loaded"}</span>
                </Badge>
              </div>
              {blockingReason ? (
                <Alert className="border-amber-200 bg-amber-50/70 text-amber-950">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Provider readiness</AlertTitle>
                  <AlertDescription>{blockingReason}</AlertDescription>
                </Alert>
              ) : null}
              {requestError ? (
                <Alert className="border-rose-200 bg-rose-50/80 text-rose-950">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Chat request failed</AlertTitle>
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              ) : null}
            </CardHeader>
            <CardContent className="flex min-h-[620px] flex-col gap-0 p-0">
              <Conversation className="min-h-0 flex-1">
                <ConversationContent>
                  {messages.length === 0 ? (
                    <ConversationEmptyState description="Select Router, Direct, or Custom mode; then pick a model below." icon={<BotIcon className="size-5" />} title="One prompt input, three provider modes">
                      <div className="grid w-full max-w-3xl gap-3 md:grid-cols-2">
                        {suggestedPrompts.map((prompt) => (
                          <Button
                            className="h-auto min-h-16 justify-start whitespace-normal break-words rounded-2xl border-sky-200 bg-white/80 px-4 py-4 text-left leading-5 text-slate-800 hover:bg-sky-50"
                            key={prompt}
                            onClick={() => {
                              void handleSubmitPrompt({ text: prompt });
                            }}
                            variant="outline"
                          >
                            <span className="block w-full whitespace-normal break-words">{prompt}</span>
                          </Button>
                        ))}
                      </div>
                    </ConversationEmptyState>
                  ) : null}
                  {messages.map((message) => (
                    <Message from={message.role} key={message.id}>
                      <MessageContent>
                        <MessageResponse>{message.content}</MessageResponse>
                      </MessageContent>
                    </Message>
                  ))}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
              <Separator className="bg-sky-100" />
              <div className="space-y-3 bg-white/70 p-5">
                <PromptInput onSubmit={handleSubmitPrompt}>
                  <PromptInputBody>
                    <PromptInputTextarea disabled={isSending} placeholder="Ask the selected provider mode anything..." />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <PromptInputSelect onValueChange={(value) => setSelectedModel(String(value))} value={currentModel}>
                        <PromptInputSelectTrigger className="min-w-0 max-w-[min(26rem,calc(100vw-8rem))] rounded-md px-2.5 text-xs text-slate-600">
                          <span className="truncate">{currentModel || "Select model"}</span>
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                          {activeModels.map((model) => (
                            <PromptInputSelectItem key={model.id} value={model.id}>
                              <div className="flex min-w-0 flex-col gap-1">
                                <span className="truncate font-medium">{model.id}</span>
                                <span className="text-xs text-muted-foreground">{model.providerLabel}</span>
                              </div>
                            </PromptInputSelectItem>
                          ))}
                        </PromptInputSelectContent>
                      </PromptInputSelect>
                      <span className="font-mono text-xs text-slate-500">Models: {activeModels.length}</span>
                    </PromptInputTools>
                    <PromptInputSubmit disabled={Boolean(blockingReason) || isSending} status={isSending ? "streaming" : "ready"} />
                  </PromptInputFooter>
                </PromptInput>
                {providerMode === "0g-router-testnet" && modelsLoading ? (
                  <StatusLine kind="loading" text="Loading Router models..." />
                ) : null}
                {providerMode === "0g-router-testnet" && !modelsLoading && !modelsError && activeModels.length > 0 ? (
                  <StatusLine kind="ready" text="Router models ready" />
                ) : null}
                {providerMode === "custom-openai" && modelsLoading ? (
                  <StatusLine kind="loading" text="Loading custom provider models..." />
                ) : null}
                {providerMode === "custom-openai" && !modelsLoading && !modelsError && activeModels.length > 0 ? (
                  <StatusLine kind="ready" text="Custom provider models ready" />
                ) : null}
                {providerMode === "custom-openai" && !modelsLoading && modelsError ? (
                  <StatusLine kind="error" text={modelsError} />
                ) : null}
                {providerMode === "0g-direct" && modelsLoading ? (
                  <StatusLine kind="loading" text="Loading Direct SDK services..." />
                ) : null}
                {providerMode === "0g-direct" && !modelsLoading && !directError && directServices.length > 0 ? (
                  <StatusLine kind="ready" text="Direct SDK services ready" />
                ) : null}
                {providerMode === "0g-direct" && !modelsLoading && directError ? (
                  <StatusLine kind="error" text={directError} />
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <ReadinessCard eyebrow="Router" title="Unified Router balance">
            <p>This shared server-side balance is visible to every visitor and belongs to `ZERO_G_ROUTER_API_KEY`.</p>
            <div className="mt-5 rounded-2xl bg-sky-50 p-4 font-mono text-xs text-slate-700">
              <div className="flex justify-between gap-4">
                <span>Total</span>
                <strong>{routerBalance?.totalBalanceZeroG ?? "Not configured"}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-4 border-t border-sky-100 pt-2">
                <span>Deposit</span>
                <strong>{routerBalance?.depositBalanceZeroG ?? "Not configured"}</strong>
              </div>
              <p className="mt-2 break-all text-slate-500">{routerBalance?.address ?? routerBalanceMessage ?? "Router balance unavailable"}</p>
            </div>
            {!routerBalance && routerBalanceMessage ? <div className="mt-3"><StatusLine kind="error" text={routerBalanceMessage} /></div> : null}
            {routerBalance ? <div className="mt-3"><StatusLine kind="ready" text="Router balance loaded" /></div> : null}
            <Button className="mt-4 rounded-full border-sky-200 bg-white/80 text-sky-950 hover:bg-sky-50" onClick={() => void loadRouterBalance()} variant="outline">
              Refresh balance
            </Button>
            <Button className="mt-2 rounded-full border-sky-200 bg-white/80 text-sky-950 hover:bg-sky-50" onClick={() => void loadServerModels("0g-router-testnet")} variant="outline">
              Refresh Router models
            </Button>
          </ReadinessCard>

          <ReadinessCard eyebrow="Custom" title="OpenAI-compatible endpoint">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Base URL</Label>
                <Input placeholder="https://api.openai.com/v1" value={customProvider.baseURL} onChange={(event) => setCustomProvider((current) => ({ ...current, baseURL: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>API key</Label>
                <Input placeholder="Stored in localStorage if saved" type="password" value={customProvider.apiKey} onChange={(event) => setCustomProvider((current) => ({ ...current, apiKey: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fallback model</Label>
                <Input placeholder="gpt-4o-mini" value={customProvider.model} onChange={(event) => setCustomProvider((current) => ({ ...current, model: event.target.value }))} />
              </div>
            </div>
            <Alert className="mt-4 border-amber-200 bg-amber-50/70 text-amber-950">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>localStorage warning</AlertTitle>
              <AlertDescription>Saved custom API keys are readable by scripts on this origin. Avoid storing high-value production keys.</AlertDescription>
            </Alert>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="rounded-full bg-sky-500 text-white hover:bg-sky-600" onClick={handleSaveCustomProvider}>
                <SaveIcon className="size-4" />
                Save locally
              </Button>
              <Button className="rounded-full border-sky-200 bg-white/80 text-sky-950 hover:bg-sky-50" onClick={() => void loadServerModels("custom-openai")} variant="outline">
                Load custom models
              </Button>
            </div>
            {providerMode === "custom-openai" && !modelsLoading && !modelsError && activeModels.length === 0 && customProvider.baseURL.trim() ? (
              <div className="mt-3"><StatusLine kind="error" text="No chatbot models loaded yet. Load models or rely on the fallback model." /></div>
            ) : null}
          </ReadinessCard>

          <ReadinessCard className="bg-sky-100/70" eyebrow="Direct" title="Wallet-signed providers">
            <p>Direct mode uses per-provider sub-accounts and wallet-signed request headers. Router balance does not apply.</p>
            <div className="mt-5 rounded-2xl bg-sky-50 p-4 font-mono text-xs text-slate-700">
              <div className="flex justify-between gap-4">
                <span>Services</span>
                <strong>{directServices.length}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-4 border-t border-sky-100 pt-2">
                <span>Provider funds</span>
                <strong>{formatZeroG(directBalance)}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-4 border-t border-sky-100 pt-2">
                <span>{selectedChain.name} wallet</span>
                <strong>{walletBalance.isLoading ? "Loading" : formattedWalletBalance ?? "Not checked"}</strong>
              </div>
              <p className="mt-2 break-words text-slate-500">{directError ?? selectedDirectService?.provider ?? "No Direct provider loaded"}</p>
            </div>
            <Button className="mt-4 rounded-full border-sky-200 bg-white/80 text-sky-950 hover:bg-sky-50" onClick={() => void loadDirectServices()} variant="outline">
              Load Direct services
            </Button>
            {providerMode === "0g-direct" && !modelsLoading && !directError && directServices.length === 0 ? (
              <div className="mt-3"><StatusLine kind="error" text="No Direct chatbot services loaded yet." /></div>
            ) : null}
          </ReadinessCard>
        </section>
      </div>
    </main>
  );
}

function HomePageClientWithPrivy() {
  const { authenticated, exportWallet, login, logout, ready } = usePrivy();
  const { fundWallet } = useFundWallet();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const privyWallet = wallets.find((wallet) => wallet.type === "ethereum");

  useEffect(() => {
    if (!privyWallet) {
      return;
    }

    void setActiveWallet(privyWallet);
  }, [privyWallet, setActiveWallet]);

  return (
    <HomePageContent
      loginMode={{
        buttonLabel: "Log in with Privy",
        buttonDisabled: false,
        helperMessage: undefined,
        secondaryConnectors: [],
        showPrivy: true,
      }}
      walletState={{
        authenticated,
        effectiveAddress: privyWallet?.address,
        exportWallet: (address) => {
          void exportWallet(address ? { address } : undefined);
        },
        fundWallet: (address, chainId) => {
          void fundWallet({
            address,
            options: {
              chain: { id: chainId },
            },
          });
        },
        hasPrivy: ready,
        isWalletReady: Boolean(privyWallet?.address),
        loginWithPrivy: () => login(),
        logoutWallet: () => {
          void logout();
        },
      }}
    />
  );
}

function HomePageClientWithoutPrivy() {
  return (
    <HomePageContent
      loginMode={{
        buttonLabel: "Configure Privy",
        buttonDisabled: true,
        helperMessage: "Set NEXT_PUBLIC_PRIVY_APP_ID to enable Privy email, passkey, Google, and wallet login.",
        secondaryConnectors: [],
        showPrivy: false,
      }}
      walletState={{
        authenticated: false,
        hasPrivy: false,
        isWalletReady: false,
        loginWithPrivy: () => {},
        logoutWallet: () => {},
      }}
    />
  );
}

export function HomePageClient() {
  if (privyAppId) {
    return <HomePageClientWithPrivy />;
  }

  return <HomePageClientWithoutPrivy />;
}
