import { z } from "zod";

import { normalizeModel, type ProxyModelsResponse } from "@/lib/models";
import { validateProviderBaseUrl } from "@/lib/provider-url";
import { getZeroGRouterConfig } from "@/lib/zero-g-router";

const requestSchema = z
  .object({
    apiKey: z.string().trim().optional(),
    baseURL: z.string().trim().optional(),
    providerMode: z.enum(["0g-router-testnet", "custom-openai"]).default("0g-router-testnet"),
  })
  .optional();

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);

  if (!parsed.success) {
    return Response.json(
      {
        configured: false,
        data: [],
        message: "Invalid model request payload.",
      },
      { status: 200 },
    );
  }

  const { apiKey, baseURL, providerMode } = parsed.data ?? { providerMode: "0g-router-testnet" as const };
  const isCustom = providerMode === "custom-openai";
  const router = getZeroGRouterConfig();
  let modelsBaseUrl = router.baseUrl;
  let modelsApiKey = router.apiKey;

  if (isCustom) {
    const validatedBaseUrl = validateProviderBaseUrl(baseURL ?? "");

    if (!validatedBaseUrl.ok) {
      return Response.json(
        {
          configured: false,
          data: [],
          message: validatedBaseUrl.error,
        },
        { status: 200 },
      );
    }

    modelsBaseUrl = validatedBaseUrl.normalizedUrl;
    modelsApiKey = apiKey?.trim() ?? "";
  }

  if (!isCustom && !router.configured) {
    return Response.json(
      {
        configured: false,
        data: [],
        message: "Set ZERO_G_ROUTER_API_KEY in .env.local to load 0G Router testnet models.",
      },
      { status: 200 },
    );
  }

  try {
    const response = await fetch(`${modelsBaseUrl}/models`, {
      headers: modelsApiKey
        ? {
            Authorization: `Bearer ${modelsApiKey}`,
          }
        : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Model fetch failed with status ${response.status}`);
    }

    const payload = (await response.json()) as ProxyModelsResponse;
    const normalized = (payload.data ?? [])
      .map(normalizeModel)
      .filter((model): model is NonNullable<ReturnType<typeof normalizeModel>> => model !== null);

    return Response.json(
      {
        configured: true,
        data: normalized,
        message:
          normalized.length === 0
            ? isCustom
              ? "No models were returned by the custom OpenAI-compatible endpoint."
              : "No models were returned by the 0G Router testnet catalog."
            : null,
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      {
        configured: true,
        data: [],
        message: isCustom
          ? "Could not load models from the custom OpenAI-compatible endpoint."
          : "Could not load models from the 0G Router testnet catalog.",
      },
      { status: 200 },
    );
  }
}
