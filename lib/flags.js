export function flagUrl(iso, width = 80) {
  if (!iso) return "";
  return `https://flagcdn.com/w${width}/${iso.toLowerCase()}.png`;
}
