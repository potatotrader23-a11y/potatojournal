export type StrategyKey = '5m' | '15m';

export function cleanStrategy(value: unknown): StrategyKey | null {
  return value === '5m' || value === '15m' ? value : null;
}

export function cleanStrategyDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

export function cleanStrategyResult(strategy: StrategyKey, value: unknown) {
  const result = Number(value);
  if (strategy === '5m' && (result === -1 || result === 2)) return result;
  if (strategy === '15m' && (result === -1 || result === 3)) return result;
  return null;
}
