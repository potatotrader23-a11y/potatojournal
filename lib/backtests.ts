export const backtestChoices = {
  structureBreakTiming: ['inside-london', 'outside-london'],
  entryHalf: ['first-half', 'second-half'],
  asianPosition: ['break-high', 'break-low', 'inside-session'],
  breakoutCandle: [
    'large-strong',
    'large-wicky',
    'medium-strong',
    'medium-wicky',
    'small-strong',
    'small-wicky',
  ],
  asianRangePriceAction: ['downtrend', 'uptrend', 'sideways', 'choppy'],
  imbalance: ['one-candle', 'two-candle', 'three-candle', 'deep-retracement'],
} as const;

export function cleanBacktestVariables(value: unknown) {
  const input =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const pick = (key: keyof typeof backtestChoices) => {
    const candidate = input[key];
    return typeof candidate === 'string' &&
      (backtestChoices[key] as readonly string[]).includes(candidate)
      ? candidate
      : backtestChoices[key][0];
  };
  const number = (key: string) => {
    const candidate = Number(input[key]);
    return Number.isFinite(candidate) ? candidate : 0;
  };
  const boolean = (key: string) => input[key] === true;

  return {
    structureBreakTiming: pick('structureBreakTiming'),
    entryHalf: pick('entryHalf'),
    maePips: Math.max(0, number('maePips')),
    asianPosition: pick('asianPosition'),
    breakoutCandle: pick('breakoutCandle'),
    asianRangePriceAction: pick('asianRangePriceAction'),
    imbalance: pick('imbalance'),
    insideHigherHighOrLow: boolean('insideHigherHighOrLow'),
    structureBreakDuringTrade: boolean('structureBreakDuringTrade'),
    tradeWithinTradingHours: boolean('tradeWithinTradingHours'),
  };
}

export function parseVariables(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function cleanResultR(value: FormDataEntryValue | null) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.max(-100, Math.min(100, result)) : 0;
}

export function cleanBacktestDate(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

export const acceptedBacktestImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function validateBacktestImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (
    value.size > 5 * 1024 * 1024 ||
    !acceptedBacktestImageTypes.has(value.type)
  ) {
    return 'Image must be a PNG, JPEG, or WebP under 5 MB';
  }
  return null;
}

export function backtestImagePath(userId: string, image: File) {
  const extension =
    image.type === 'image/png'
      ? 'png'
      : image.type === 'image/webp'
        ? 'webp'
        : 'jpg';
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}
