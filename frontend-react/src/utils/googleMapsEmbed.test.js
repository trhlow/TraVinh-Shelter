import { describe, expect, test } from 'vitest';
import { isGoogleMapsEmbedUrl } from './googleMapsEmbed.js';

describe('isGoogleMapsEmbedUrl', () => {
  test('accepts a www.google.com embed URL', () => {
    expect(isGoogleMapsEmbedUrl('https://www.google.com/maps/embed?pb=!1m17!1m12')).toBe(true);
  });

  test('accepts a maps.google.com subdomain URL', () => {
    expect(isGoogleMapsEmbedUrl('https://maps.google.com/maps?q=1,2&output=embed')).toBe(true);
  });

  test('rejects a non-google host', () => {
    expect(isGoogleMapsEmbedUrl('https://evil.example.com/maps/embed')).toBe(false);
  });

  test('rejects a host that merely contains google.com as a substring', () => {
    expect(isGoogleMapsEmbedUrl('https://google.com.evil.example/maps')).toBe(false);
  });

  test('rejects a malformed URL string', () => {
    expect(isGoogleMapsEmbedUrl('not a url')).toBe(false);
  });

  test('rejects undefined input', () => {
    expect(isGoogleMapsEmbedUrl(undefined)).toBe(false);
  });

  test('rejects null input', () => {
    expect(isGoogleMapsEmbedUrl(null)).toBe(false);
  });

  test('rejects empty string input', () => {
    expect(isGoogleMapsEmbedUrl('')).toBe(false);
  });
});
