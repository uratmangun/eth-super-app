import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  isLoopFinished,
  stepCountIs,
  streamText,
  validateUIMessages,
} from "ai";
import { z } from "zod";

import { REPO_SYSTEM_PROMPT } from "@/lib/repo-system-prompt";
import type { ChatMessageMetadata, ChatUiMessage } from "@/lib/chat-shared";
import { validateProviderBaseUrl } from "@/lib/provider-url";
import { webFetchTool } from "@/lib/web-fetch-tool";
import { getZeroGRouterConfig } from "@/lib/zero-g-router";

const requestSchema = z.object({
  apiKey: z.string().trim().optional(),
  baseURL: z.string().trim().optional(),
  messages: z.array(z.unknown()).default([]),
  model: z.string().trim().optional(),
  providerMode: z.enum(["0g-router-testnet", "custom-openai"]).default("0g-router-testnet"),
  systemPrompt: z.string().optional(),
});

function toValidationResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function supportsToolCalling(providerMode: "0g-router-testnet" | "custom-openai") {
  return providerMode === "custom-openai";
}

function createZeroGRouterFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);

    if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
      return response;
    }

    let buffer = "";
    const stream = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream<string, string>({
          flush(controller) {
            if (buffer) {
              const data = buffer.replace(/^data:\s*/m, "").trim();

              if (!data.startsWith('{"x_0g_trace"')) {
                controller.enqueue(buffer);
              }
            }
          },
          transform(chunk, controller) {
            buffer += chunk;
          const frames = buffer.split("\n\n");
            for (const frame of frames) {
              const data = frame.replace(/^data:\s*/m, "").trim();

              if (!data.startsWith('{"x_0g_trace"')) {
                controller.enqueue(`${frame}\n\n`);
              }
            }
          },
        }),
      )
      .pipeThrough(new TextEncoderStream());

    return new Response(stream, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  };
}

function toOpenAICompatibleMessages(messages: ChatUiMessage[]) {
  return messages.map((message) => ({
    content: message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join("\\n"),
    role: message.role,
  }));
}

function createRouterUiMessageStreamResponse({
  apiKey,
  baseURL,
  messages,
  model,
  system,
}: {
  apiKey: string;
  baseURL: string;
  messages: ChatUiMessage[];
  model: string;
  system: string;
}) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let textStarted = false;
      let buffer = "";

      const send = (value: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}

`));
      };

      send({ type: "start" });
      send({ type: "start-step" });

      try {
        const response = await fetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { content: system, role: "system" },
              ...toOpenAICompatibleMessages(messages),
            ],
            model,
            stream: true,
          }),
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`0G Router request failed: ${response.status} ${response.statusText} ${errorText}`.trim());
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += value;
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const data = frame.replace(/^data:\s*/m, "").trim();

            if (!data || data === "[DONE]" || data.startsWith('{"x_0g_trace"')) {
              continue;
            }

            const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }> };
            const delta = payload.choices?.[0]?.delta?.content ?? "";

            if (delta) {
              if (!textStarted) {
                send({ id: "txt-0", type: "text-start" });
                textStarted = true;
              }

              send({ delta, id: "txt-0", type: "text-delta" });
            }
          }
        }

        if (textStarted) {
          send({ id: "txt-0", type: "text-end" });
        }

        send({ type: "finish-step" });
        send({ finishReason: "stop", messageMetadata: { finishReason: "stop" }, type: "finish" });
      } catch (error) {
        send({ errorText: error instanceof Error ? error.message : "0G Router request failed.", type: "error" });
        send({ type: "finish-step" });
        send({ finishReason: "error", messageMetadata: { finishReason: "error" }, type: "finish" });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);

  if (!parsed.success) {
    return toValidationResponse("Invalid chat request payload.");
  }

  const { apiKey, baseURL, messages, model, providerMode, systemPrompt } = parsed.data;
  if (!model?.trim()) {
    return toValidationResponse("Select a model before sending a chat request.");
  }
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

  const validatedMessages = await validateUIMessages<ChatUiMessage>({ messages }).catch(() => null);

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

  const resolvedSystemPrompt = systemPrompt?.trim() || REPO_SYSTEM_PROMPT;

  if (!isCustom) {
    return createRouterUiMessageStreamResponse({
      apiKey: providerApiKey,
      baseURL: providerBaseUrl,
      messages: validatedMessages,
      model,
      system: resolvedSystemPrompt,
    });
  }

  const provider = createOpenAICompatible({
    name: "custom-openai-compatible",
    baseURL: providerBaseUrl,
    apiKey: providerApiKey || undefined,
  });

  const useTools = supportsToolCalling(providerMode);

  const result = streamText({
    model: provider.chatModel(model),
    system: resolvedSystemPrompt,
    messages: modelMessages,
    ...(useTools
      ? {
          stopWhen: [isLoopFinished(), stepCountIs(4)],
          prepareStep: ({ stepNumber }: { stepNumber: number }) => {
            if (stepNumber <= 1) {
              return undefined;
            }

            return {
              activeTools: [],
              system: `${resolvedSystemPrompt}\n\nYou have already received the tool result needed for this request. Do not call any more tools. Use the available tool result to answer directly and cite the source URL when relevant.`,
              toolChoice: "none" as const,
            };
          },
          tools: {
            "web-fetch": webFetchTool,
          },
        }
      : {}),
  });

  return result.toUIMessageStreamResponse<ChatUiMessage>({
    originalMessages: validatedMessages,
    sendStart: true,
    sendFinish: true,
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          finishReason: part.finishReason,
        } satisfies ChatMessageMetadata;
      }

      return undefined;
    },
    onError: (error) => {
      return error instanceof Error ? error.message : "Chat request failed.";
    },
  });
}
