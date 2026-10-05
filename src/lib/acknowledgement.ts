/** UTC calendar arithmetic keeps day counts stable across daylight-saving changes. */
export function closingDate(
  creation: string,
  type: string,
  dues: string,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(creation) || !/^\d+$/.test(dues)) return "";
  const count = Number(dues);
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    !["Weekly", "Biweekly"].includes(type)
  )
    return "";
  const date = new Date(`${creation}T00:00:00Z`);
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== creation)
    return "";
  date.setUTCDate(date.getUTCDate() + count * (type === "Weekly" ? 7 : 14));
  if (isNaN(date.getTime()) || date.getUTCFullYear() > 9999) return "";
  return date.toISOString().slice(0, 10);
}

/** Scheme amounts without a grams unit must not be mistaken for weights. */
export function goldGrams(value: string, isScheme = false): string {
  const normalized = value
    .trim()
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4");
  const match = normalized.match(
    /(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)\s*(?:GRAMS?|GMS?|G)\b/i,
  );
  if (!match)
    return !isScheme && /^\d+(?:\.\d+)?$/.test(normalized) ? normalized : "";
  const [numerator, denominator] = match[1].split("/").map(Number);
  const grams = denominator === undefined ? numerator : numerator / denominator;
  return Number.isFinite(grams) && grams > 0 ? String(grams) : "";
}
