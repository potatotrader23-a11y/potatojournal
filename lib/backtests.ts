export function cleanBacktestVariables(_value: unknown) {
  return {};
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
