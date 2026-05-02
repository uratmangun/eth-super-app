import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { DEFAULT_MODEL, REPO_SYSTEM_PROMPT } from "@/lib/repo-system-prompt";
import { validateProviderBaseUrl } from "@/lib/provider-url";
import { getZeroGRouterConfig } from "@/lib/zero-g-router";

const requestSchema = z.object({
  apiKey: z.string().trim().optional(),
  baseURL: z.string().trim().optional(),
  messages: z.array(z.unknown()).default([]),
  model: z.string().trim().default(DEFAULT_MODEL),
  providerMode: z.enum(["0g-router-testnet", "custom-openai"]).default("0g-router-testnet"),
  systemPrompt: z.string().optional(),
});

function toValidationResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);

  if (!parsed.success) {
    return toValidationResponse("Invalid chat request payload.");
  }

  const { apiKey, baseURL, messages, model, providerMode, systemPrompt } = parsed.data;
  const router = getZeroGRouterConfig();
  const isCustom = providerMode === "custom-openai";
  let providerBaseUrl = router.baseUrl;
  let providerApiKey = router.apiKey;

  if (isCustom) {
    const validatedBaseUrl = validateProviderBaseUrl(baseURL ?? "");

    if (!validatedBaseUrl.ok) {
      return toValidationResponse(validatedBaseUrl.error);
    }

    providerBaseUrl = validatedBaseUrl.normalizedUrl;
    providerApiKey = apiKey?.trim() ?? "";
  }

  if (!isCustom && !router.configured) {
    return toValidationResponse("Set ZERO_G_ROUTER_API_KEY in .env.local before sending Router testnet chat requests.", 503);
  }

  const validatedMessages = await validateUIMessages<UIMessage>({ messages }).catch(() => null);

  if (!validatedMessages || validatedMessages.length === 0) {
    return toValidationResponse("Add a message before sending a chat request.");
  }

  const modelMessages = await convertToModelMessages(
    validatedMessages.map((message) => ({
      ...message,
      id: undefined,
    })),
  ).catch(() => null);

  if (!modelMessages || modelMessages.length === 0) {
    return toValidationResponse("Could not convert chat messages to model input.");
  }

  const provider = createOpenAICompatible({
    name: isCustom ? "custom-openai-compatible" : "0g-router-testnet",
    baseURL: providerBaseUrl,
    apiKey: providerApiKey || undefined,
  });

  const resolvedSystemPrompt = systemPrompt?.trim() || REPO_SYSTEM_PROMPT;

  const result = streamText({
    model: provider.chatModel(model || DEFAULT_MODEL),
    system: resolvedSystemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    sendStart: true,
    sendFinish: true,
  });
}
