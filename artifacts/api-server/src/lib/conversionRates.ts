export const CONVERSION_RATES = {
  normal: 500,
  rare: 100,
} as const;

export type GemType = keyof typeof CONVERSION_RATES;

export function isGemType(value: unknown): value is GemType {
  return value === "normal" || value === "rare";
}

export function getConversionRate(gemType: GemType): number {
  return CONVERSION_RATES[gemType];
}