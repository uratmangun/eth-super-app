import { formatNeuronToZeroG, getZeroGRouterConfig } from "@/lib/zero-g-router";

type RouterBalanceResponse = {
  address?: string;
  deposit_balance?: string;
  total_balance?: string;
};

export async function GET() {
  const router = getZeroGRouterConfig();

  if (!router.configured) {
    return Response.json({
      configured: false,
      data: null,
      message: "Set ZERO_G_ROUTER_API_KEY in .env.local to show the shared Router balance.",
    });
  }

  try {
    const response = await fetch(`${router.baseUrl}/account/balance`, {
      headers: {
        Authorization: `Bearer ${router.apiKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Router balance fetch failed with status ${response.status}`);
    }

    const payload = (await response.json()) as RouterBalanceResponse;

    return Response.json({
      configured: true,
      data: {
        address: payload.address ?? "",
        depositBalanceNeuron: payload.deposit_balance ?? "0",
        depositBalanceZeroG: formatNeuronToZeroG(payload.deposit_balance),
        totalBalanceNeuron: payload.total_balance ?? "0",
        totalBalanceZeroG: formatNeuronToZeroG(payload.total_balance),
      },
      message: null,
    });
  } catch {
    return Response.json({
      configured: true,
      data: null,
      message: "Could not load the shared 0G Router balance.",
    });
  }
}
