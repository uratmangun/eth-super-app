export const ZERO_G_ROUTER_TESTNET_BASE_URL =
  process.env.ZERO_G_ROUTER_BASE_URL?.trim() ||
  "https://router-api-testnet.integratenetwork.work/v1";

export const ZERO_G_ROUTER_API_KEY = process.env.ZERO_G_ROUTER_API_KEY?.trim() || "";

export function getZeroGRouterConfig() {
  return {
    apiKey: ZERO_G_ROUTER_API_KEY,
    baseUrl: ZERO_G_ROUTER_TESTNET_BASE_URL,
    configured: Boolean(ZERO_G_ROUTER_API_KEY),
  };
}

export function formatNeuronToZeroG(value: string | bigint | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "0 0G";
  }

  const amount = typeof value === "bigint" ? value : BigInt(value);
  const base = BigInt(10) ** BigInt(18);
  const precision = BigInt(10) ** BigInt(14);
  const whole = amount / base;
  const decimals = ((amount % base) / precision).toString().padStart(4, "0").replace(/0+$/, "");

  return `${whole.toString()}${decimals ? `.${decimals}` : ""} 0G`;
}
