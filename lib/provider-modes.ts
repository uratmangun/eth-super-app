export const providerModes = ["0g-router-testnet", "custom-openai"] as const;

export type ServerProviderMode = (typeof providerModes)[number];

export function isServerProviderMode(value: string): value is ServerProviderMode {
  return providerModes.includes(value as ServerProviderMode);
}
