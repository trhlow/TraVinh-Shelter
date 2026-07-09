// Cuts leading entries where every numeric series value is 0, so trend charts
// don't imply history from before the platform had any real data. Always
// keeps at least the last entry (the current period), even if it's still 0.
export function trimLeadingEmptyMonths(buckets) {
  const firstRealIndex = buckets.findIndex((bucket) => (bucket.current || 0) > 0 || (bucket.previous || 0) > 0);
  if (firstRealIndex === -1) return buckets.slice(-1);
  return buckets.slice(firstRealIndex);
}
