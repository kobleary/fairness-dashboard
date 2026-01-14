export function formatNumber(value) {
  if (value === null || value === undefined) return 'N/A';
  return typeof value === 'number' ? value.toFixed(2) : value;
}

export function formatYear(year) {
  return year.toString();
}
