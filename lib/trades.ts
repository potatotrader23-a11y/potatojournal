export const acceptedTradeImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function cleanTradeDate(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

export function cleanTradeTime(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }
  return value;
}

export function cleanTradeNumber(
  value: FormDataEntryValue | null,
  { positive = false, limit = 1_000_000_000 } = {},
) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) return null;
  if (positive && parsed <= 0) return null;
  return parsed;
}

export function validateTradeImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (
    value.size > 5 * 1024 * 1024 ||
    !acceptedTradeImageTypes.has(value.type)
  ) {
    return 'Image must be a PNG, JPEG, or WebP under 5 MB';
  }
  return null;
}

export function tradeImagePath(userId: string, image: File) {
  const extension =
    image.type === 'image/png'
      ? 'png'
      : image.type === 'image/webp'
        ? 'webp'
        : 'jpg';
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}
