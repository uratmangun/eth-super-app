"use client";

import {
  AlertCircleIcon,
  BotIcon,
  ClipboardCheckIcon,
  CopyIcon,
  Loader2Icon,
  LogOutIcon,
  NetworkIcon,
  WalletIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFundWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useBalance, useChainId, useConnect, useConnection, useConnectorClient, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { formatUnits } from "viem";

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
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { zeroGChains, zeroGTestnet } from "@/lib/chains";
import { clientToSigner } from "@/lib/ethers-adapter";
import { cn } from "@/lib/utils";
import {
  createZeroGBroker,
  getZeroGProviderBalance,
  listZeroGChatbotServices,
  sendZeroGChatCompletion,
  type ZeroGChatMessage,
  type ZeroGMetadata,
  type ZeroGService,
} from "@/lib/zero-g-compute";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ComputeStatus = "idle" | "initializing" | "loading-services" | "ready" | "no-provider" | "error";

type ComputeState = {
  balance: bigint | null;
  broker: Awaited<ReturnType<typeof createZeroGBroker>> | null;
  error: string | null;
  metadata: ZeroGMetadata | null;
  selectedProvider: ZeroGService | null;
  services: ZeroGService[];
  status: ComputeStatus;
};

type ModelOption = {
  id: string;
  name: string;
  source: "router" | "direct";
};

type WalletState = {
  authenticated: boolean;
  effectiveAddress?: string;
  effectiveChainId: number;
  exportWallet?: (address?: string) => void;
  fundWallet?: (address: string, chainId: number) => void;
  hasPrivy: boolean;
  isWalletReady: boolean;
  loginWithPrivy: () => void;
  logoutWallet: () => void;
  privyWallet?: {
    switchChain: (chainId: number) => Promise<void>;
  };
};

type LoginMode = {
  buttonLabel: string;
  buttonDisabled?: boolean;
  helperMessage?: string;
  secondaryConnectors: ReturnType<typeof useConnectors>;
  showPrivy: boolean;
};

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const suggestedPrompts = [
  "Explain my 0G provider balance and what needs setup.",
  "Compare the available 0G inference models.",
  "What has to be ready before I can send a Direct Compute prompt?",
  "Draft a short test prompt for the selected 0G model.",
];

const routerChatModels: ModelOption[] = [
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek Chat V3", source: "router" },
  { id: "qwen/qwen3-vl-30b-a3b-instruct", name: "Qwen3 VL 30B", source: "router" },
  { id: "qwen3.6-plus", name: "Qwen3.6 Plus", source: "router" },
  { id: "zai-org/GLM-5-FP8", name: "GLM-5 FP8", source: "router" },
  { id: "zai-org/GLM-5.1-FP8", name: "GLM-5.1 FP8", source: "router" },
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

function uniqueModelOptions(models: ModelOption[]) {
  const seen = new Set<string>();

  return models.filter((model) => {
    if (seen.has(model.id)) {
      return false;
    }

    seen.add(model.id);
    return true;
  });
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

function HomePageContent({ loginMode, walletState }: { loginMode: LoginMode; walletState: WalletState }) {
  const chainId = useChainId();
  const connection = useConnection();
  const { connect, error: connectError, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, status: switchStatus, error: switchError } = useSwitchChain();
  const { data: connectorClient } = useConnectorClient({ chainId: zeroGTestnet.id });
  const [selectedChainId, setSelectedChainId] = useState<number>(zeroGTestnet.id);
  const [compute, setCompute] = useState<ComputeState>({
    balance: null,
    broker: null,
    error: null,
    metadata: null,
    selectedProvider: null,
    services: [],
    status: "idle",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedModel, setSelectedModel] = useState(routerChatModels[0]?.id ?? "");
  const [verification, setVerification] = useState<boolean | null>(null);
  const [isSending, setIsSending] = useState(false);

  const effectiveAddress = walletState.effectiveAddress ?? connection.address;
  const effectiveChainId = walletState.effectiveChainId || chainId;
  const isWalletReady = walletState.isWalletReady || Boolean(connection.address);
  const selectedChain = zeroGChains.find((chain) => chain.id === selectedChainId) ?? zeroGTestnet;
  const isCorrectChain = effectiveChainId === selectedChain.id;
  const isComputeChain = selectedChain.id === zeroGTestnet.id;
  const walletBalance = useBalance({
    address: effectiveAddress as `0x${string}` | undefined,
    chainId: selectedChain.id,
    query: {
      enabled: Boolean(effectiveAddress),
    },
  });
  const modelOptions = useMemo(
    () =>
      uniqueModelOptions([
        ...compute.services.map((service) => ({
          id: service.model,
          name: service.model,
          source: "direct" as const,
        })),
        ...routerChatModels,
      ]),
    [compute.services],
  );

  const currentModel = modelOptions.some((model) => model.id === selectedModel) ? selectedModel : modelOptions[0]?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    async function initializeCompute() {
      if (!connectorClient || !isWalletReady || !isCorrectChain) {
        setCompute((current) => ({
          ...current,
          balance: null,
          broker: null,
          error: null,
          metadata: null,
          selectedProvider: null,
          services: [],
          status: "idle",
        }));
        return;
      }

      setCompute((current) => ({ ...current, error: null, status: "initializing" }));

      try {
        const signer = clientToSigner(connectorClient);
        const broker = await createZeroGBroker(signer);

        if (cancelled) {
          return;
        }

        setCompute((current) => ({ ...current, broker, status: "loading-services" }));

        const services = await listZeroGChatbotServices(broker);
        const selectedProvider = services[0] ?? null;
        const [metadata, balance] = selectedProvider
          ? await Promise.all([
              broker.inference.getServiceMetadata(selectedProvider.provider).catch(() => null),
              getZeroGProviderBalance(broker, selectedProvider.provider).catch(() => null),
            ])
          : [null, null];

        if (cancelled) {
          return;
        }

        setCompute({
          balance,
          broker,
          error: null,
          metadata,
          selectedProvider,
          services,
          status: selectedProvider ? "ready" : "no-provider",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCompute({
          balance: null,
          broker: null,
          error: getErrorMessage(error),
          metadata: null,
          selectedProvider: null,
          services: [],
          status: "error",
        });
      }
    }

    void initializeCompute();

    return () => {
      cancelled = true;
    };
  }, [connectorClient, isWalletReady, isCorrectChain]);

  const blockingReason = useMemo(() => {
    if (!isWalletReady) {
      return loginMode.showPrivy ? "Log in with Privy email or wallet auth before sending prompts." : "Connect a wallet before sending prompts.";
    }

    if (!isComputeChain) {
      return "0G Direct Compute is currently wired to Galileo testnet. Switch the selector back to Galileo before sending prompts.";
    }

    if (!isCorrectChain) {
      return `Switch to ${selectedChain.name} before sending prompts.`;
    }

    if (compute.status === "initializing" || compute.status === "loading-services") {
      return "0G Direct Compute is still loading provider readiness.";
    }

    if (compute.status === "no-provider") {
      return "No chatbot inference provider is available on the connected 0G testnet.";
    }

    if (compute.status === "error") {
      return compute.error ?? "0G Direct Compute failed to initialize.";
    }

    if (!compute.broker || !compute.selectedProvider) {
      return "Select an available 0G inference provider before sending prompts.";
    }

    return null;
  }, [compute, isComputeChain, isCorrectChain, isWalletReady, loginMode.showPrivy, selectedChain.name]);

  const handleCopyAddress = useCallback(async () => {
    if (!effectiveAddress) {
      return;
    }

    await navigator.clipboard.writeText(effectiveAddress);
    setCopiedAddress(true);
    window.setTimeout(() => setCopiedAddress(false), 1600);
  }, [effectiveAddress]);

  const handleSwitchSelectedChain = useCallback(async () => {
    if (!isWalletReady || isCorrectChain) {
      return;
    }

    if (walletState.privyWallet) {
      await walletState.privyWallet.switchChain(selectedChain.id);
      return;
    }

    switchChain({ chainId: selectedChain.id });
  }, [isCorrectChain, isWalletReady, selectedChain.id, switchChain, walletState.privyWallet]);

  const handleSubmitPrompt = useCallback(
    async ({ text }: { text: string }) => {
      const content = text.trim();

      if (!content || isSending) {
        return;
      }

      if (blockingReason || !compute.broker || !compute.selectedProvider) {
        setRequestError(blockingReason ?? "0G Direct Compute is not ready.");
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
      setVerification(null);

      try {
        const zeroGMessages: ZeroGChatMessage[] = nextMessages.map((message) => ({
          content: message.content,
          role: message.role,
        }));
        const result = await sendZeroGChatCompletion({
          broker: compute.broker,
          messages: zeroGMessages,
          model: currentModel,
          providerAddress: compute.selectedProvider.provider,
        });

        setMessages((current) => [
          ...current,
          {
            content: result.content,
            id: crypto.randomUUID(),
            role: "assistant",
          },
        ]);
        setVerification(result.verified);
      } catch (error) {
        setRequestError(getErrorMessage(error));
      } finally {
        setIsSending(false);
      }
    },
    [blockingReason, compute.broker, compute.selectedProvider, currentModel, isSending, messages],
  );

  const providerLabel = currentModel || compute.metadata?.model || compute.selectedProvider?.model || "Provider pending";
  const providerTone = compute.status === "ready" ? "green" : compute.status === "error" || compute.status === "no-provider" ? "red" : "amber";
  const walletStatus = isWalletReady ? shortAddress(effectiveAddress) : connectStatus === "pending" ? "Connecting" : "Disconnected";
  const formattedWalletBalance = walletBalance.data
    ? `${formatUnits(walletBalance.data.value, walletBalance.data.decimals)} ${walletBalance.data.symbol}`
    : null;

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(186,230,253,0.95),transparent_32%),radial-gradient(circle_at_84%_4%,rgba(14,165,233,0.18),transparent_30%),linear-gradient(180deg,#eaf7ff_0%,#dff3ff_100%)] px-4 py-5 text-slate-950 md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.34)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-7">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-sky-200 bg-white/70 p-4 shadow-[0_24px_70px_-48px_rgba(14,116,144,0.55)] backdrop-blur md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500 font-mono text-base font-bold text-white shadow-[0_18px_38px_-24px_rgba(2,132,199,0.85)]">
              0G
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Galileo Compute Console</h1>
              <p className="text-sm text-slate-600 md:text-base">Wallet-signed LLM access on 0G testnet</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2 py-1.5">
              <StatusDot tone={isCorrectChain ? "green" : isWalletReady ? "red" : "slate"} />
              <Select onValueChange={(value) => setSelectedChainId(Number(value))} value={String(selectedChain.id)}>
                <SelectTrigger className="h-6 border-none bg-transparent px-1 py-0 font-mono text-xs text-sky-950 shadow-none">
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
            </div>
            {isWalletReady ? (
              <>
                <Button
                  className="rounded-full bg-sky-500 px-4 text-white hover:bg-sky-600"
                  onClick={() => {
                    if (walletState.authenticated) {
                      walletState.logoutWallet();
                      return;
                    }

                    disconnect();
                  }}
                >
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
              Direct SDK · {selectedChain.testnet ? "Testnet" : "Mainnet"}
            </Badge>
            <div className="space-y-5">
              <h2 className="max-w-[9ch] text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-7xl">
                Ask the 0G network, not a centralized proxy.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-slate-600">
                Log in, switch to Galileo, choose an inference provider, and send prompts through wallet-signed compute requests.
              </p>
            </div>
            <div className="grid gap-5 text-sm text-slate-800">
              {[
                loginMode.showPrivy ? "Log in with Privy using email, wallet, or passkey" : "Connect MetaMask or injected wallet",
                "Switch to 0G Galileo testnet",
                "Fund a provider sub-account and chat",
              ].map((step, index) => (
                <div className="flex items-center gap-4" key={step}>
                  <span className="flex size-8 items-center justify-center rounded-full bg-sky-100 font-mono text-xs font-bold text-sky-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </aside>

          <Card className="overflow-hidden rounded-[2.5rem] border-sky-200 bg-white/90 p-0 shadow-[0_38px_90px_-46px_rgba(14,116,144,0.55)] backdrop-blur">
            <CardHeader className="border-b border-sky-100 bg-white/65 px-6 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl tracking-tight text-slate-950">0G LLM Chatbox</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">Prompts route through wallet-signed Direct Compute when readiness is complete.</p>
                </div>
                <Badge className="w-fit max-w-full gap-2 rounded-full border-sky-200 bg-sky-50 px-3 py-2 font-mono text-xs text-slate-800" variant="outline">
                  <StatusDot tone={providerTone} />
                  <span className="max-w-full break-all">{providerLabel}</span>
                </Badge>
              </div>
              {blockingReason ? (
                <Alert className="border-amber-200 bg-amber-50/70 text-amber-950">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Readiness blocked</AlertTitle>
                  <AlertDescription>{blockingReason}</AlertDescription>
                </Alert>
              ) : null}
              {requestError ? (
                <Alert className="border-rose-200 bg-rose-50/80 text-rose-950">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Inference request failed</AlertTitle>
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              ) : null}
            </CardHeader>

            <CardContent className="flex min-h-[620px] flex-col gap-0 p-0">
              <Conversation className="min-h-0 flex-1">
                <ConversationContent>
                  {messages.length === 0 ? (
                    <ConversationEmptyState
                      description="Once connected, prompts will use Direct SDK request headers from the selected provider."
                      icon={<BotIcon className="size-5" />}
                      title="Connect wallet to start a 0G inference session"
                    >
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
                    <PromptInputTextarea disabled={isSending} placeholder="Ask 0G Direct Compute anything after wallet connection..." />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <PromptInputSelect onValueChange={(value) => setSelectedModel(String(value))} value={currentModel}>
                        <PromptInputSelectTrigger className="min-w-0 max-w-[min(26rem,calc(100vw-8rem))] rounded-md px-2.5 text-xs text-slate-600">
                          <PromptInputSelectValue placeholder="Select model" />
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                          {modelOptions.map((model) => (
                            <PromptInputSelectItem key={model.id} value={model.id}>
                              <div className="flex min-w-0 flex-col gap-1">
                                <span className="truncate font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {model.source === "direct" ? "0G Direct provider" : "0G Router catalog"}
                                </span>
                              </div>
                            </PromptInputSelectItem>
                          ))}
                        </PromptInputSelectContent>
                      </PromptInputSelect>
                      <span className="font-mono text-xs text-slate-500">
                        Direct SDK headers: {compute.status === "ready" ? "ready" : "not generated"}
                      </span>
                    </PromptInputTools>
                    <PromptInputSubmit disabled={Boolean(blockingReason) || isSending} status={isSending ? "streaming" : "ready"} />
                  </PromptInputFooter>
                </PromptInput>
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-500">
                  <span>Response verification: {verification === null ? "optional" : verification ? "valid" : "not verified"}</span>
                  <span className="break-all">{compute.metadata?.endpoint ? `Endpoint ${compute.metadata.endpoint}` : "Endpoint pending"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <ReadinessCard eyebrow="Wallet" title={loginMode.showPrivy ? "Privy wallet access" : "Injected / MetaMask only"}>
            <p>
              {loginMode.showPrivy
                ? "Privy can onboard users with email, passkeys, Google, and wallets while still supporting 0G Galileo as an EVM chain."
                : "The fallback implementation skips WalletConnect and relies on browser wallets for signing compute requests."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="gap-2 rounded-full bg-sky-50 px-3 py-2 font-mono text-xs text-slate-700" variant="secondary">
                <StatusDot tone={isWalletReady ? "green" : connectStatus === "pending" ? "amber" : "slate"} />
                {walletStatus}
              </Badge>
              {effectiveAddress ? (
                <Button className="h-8 rounded-full border-sky-200 bg-white/80 px-3 font-mono text-xs text-slate-700" onClick={handleCopyAddress} variant="outline">
                  {copiedAddress ? <ClipboardCheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                  {copiedAddress ? "Copied" : "Copy address"}
                </Button>
              ) : null}
              {connectError ? <span className="text-xs text-rose-600">{connectError.message}</span> : null}
            </div>
            <div className="mt-5 rounded-2xl bg-sky-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs text-slate-600">{selectedChain.name} balance</span>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {walletBalance.isLoading ? "Loading" : formattedWalletBalance ?? "Not checked"}
                </span>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-slate-500">{effectiveAddress ?? "No wallet address connected"}</p>
            </div>
            {walletState.fundWallet && effectiveAddress ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="rounded-full bg-sky-500 text-white hover:bg-sky-600" onClick={() => walletState.fundWallet?.(effectiveAddress, selectedChain.id)}>
                  Open Privy funding
                </Button>
                {walletState.exportWallet ? (
                  <Button className="rounded-full border-sky-200 bg-white/80 text-sky-950 hover:bg-sky-50" onClick={() => walletState.exportWallet?.(effectiveAddress)} variant="outline">
                    Export embedded wallet
                  </Button>
                ) : null}
              </div>
            ) : null}
          </ReadinessCard>

          <ReadinessCard eyebrow="Chain" title={selectedChain.name}>
            <p>{selectedChain.testnet ? "Galileo testnet uses chain ID 16602 and test funds." : "0G mainnet uses chain ID 16661 with production 0G balances."}</p>
            <div className="mt-5 space-y-2 font-mono text-xs text-slate-600">
              <p className="break-all">Chain ID&nbsp;&nbsp;{selectedChain.id}</p>
              <p className="break-all">RPC&nbsp;&nbsp;{selectedChain.rpcUrls.default.http[0]}</p>
              <p className="break-all">Explorer&nbsp;&nbsp;{selectedChain.blockExplorers?.default.url}</p>
            </div>
            {isWalletReady && !isCorrectChain ? (
              <Button
                className="mt-5 rounded-full bg-sky-500 text-white hover:bg-sky-600"
                disabled={switchStatus === "pending"}
                onClick={() => {
                  void handleSwitchSelectedChain();
                }}
              >
                {switchStatus === "pending" ? <Loader2Icon className="size-4 animate-spin" /> : <NetworkIcon className="size-4" />}
                Switch to {selectedChain.name}
              </Button>
            ) : null}
            {switchError ? <p className="mt-3 text-xs text-rose-600">{switchError.message}</p> : null}
          </ReadinessCard>

          <ReadinessCard className="bg-sky-100/70" eyebrow="Compute" title="Direct SDK inference">
            <p>Provider list, metadata, auth headers, and funding state appear here before the chatbox accepts prompts.</p>
            <div className="mt-5 rounded-2xl bg-sky-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs text-slate-600">Provider funds</span>
                <span className="font-mono text-xs font-bold text-amber-700">{formatZeroG(compute.balance)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 border-t border-sky-100 pt-3">
                <span className="font-mono text-xs text-slate-600">Services</span>
                <span className="font-mono text-xs font-bold text-slate-800">{compute.services.length}</span>
              </div>
              {compute.status === "initializing" || compute.status === "loading-services" ? (
                <div className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-sky-700">
                  <Loader2Icon className="size-3 animate-spin" />
                  Loading Direct SDK
                </div>
              ) : null}
              {compute.error ? <p className="mt-3 break-words text-xs text-rose-600">{compute.error}</p> : null}
            </div>
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
        effectiveChainId: Number(privyWallet?.chainId?.replace("eip155:", "") ?? 0),
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
        privyWallet,
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
        effectiveChainId: 0,
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
