// Shared guard for Google Maps embed URLs: only allow google.com / *.google.com hosts,
// used both when a broker pastes an embed (write path) and when a property is normalized
// from the backend (read path) — attributes is free-form JSONB, so it must be re-checked
// on read even though the paste form already validates it on write.
export function isGoogleMapsEmbedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.hostname === 'google.com' || parsed.hostname.endsWith('.google.com');
}
