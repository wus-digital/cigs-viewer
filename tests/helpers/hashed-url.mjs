import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';

// Mirrors the CIGS render service's decode side (wus-digital/cigs
// src/hash.util.ts) so tests assert on the real underlying configuration
// code, baureihe and camera instead of on the opaque `h1...` hash string.
//
// The camera is appended as a plain `_${cameraId}` suffix *after* the hash
// and is never part of the compressed payload, so it must be supplied by the
// caller (splitting it back out of the URL is ambiguous whenever the camera
// ID itself contains underscores, since the hash is base64url and may also
// contain underscores).
export function decodeHashedUrl(url, cameraId) {
  assert.ok(
    typeof cameraId === 'string' && cameraId !== '',
    'decodeHashedUrl requires the expected cameraId to strip its suffix'
  );
  const suffix = `_${cameraId}.webp`;
  assert.ok(
    url.endsWith(suffix),
    `expected URL ending in "${suffix}", got: ${url}`
  );
  const withoutCameraSuffix = url.slice(0, -suffix.length);
  const match = withoutCameraSuffix.match(/^(.*)\/([A-Z0-9]+)_(h1[A-Za-z0-9_-]+)$/);
  assert.ok(match, `expected a hashed URL, got: ${url}`);
  const [, base, baureihe, hash] = match;
  const compressed = Buffer.from(hash.slice(2), 'base64url');
  const payload = inflateRawSync(compressed).toString('utf-8');
  assert.ok(payload.startsWith('cfg:v1:'), `unexpected payload: ${payload}`);
  return {
    base,
    baureihe,
    cameraId,
    configurationCode: payload.slice('cfg:v1:'.length),
  };
}

/** Convenience helper returning just the decoded plain-text configuration code. */
export function decodedCode(url, cameraId) {
  return decodeHashedUrl(url, cameraId).configurationCode;
}

/**
 * Convenience helper decoding an array of hashed URLs into their plain-text
 * codes. `cameraId` may be a single ID shared by every URL, or an array of
 * IDs parallel to `urls`.
 */
export function decodedCodes(urls, cameraId) {
  if (Array.isArray(cameraId)) {
    assert.equal(
      urls.length,
      cameraId.length,
      'urls and cameraId arrays must have the same length'
    );
    return urls.map((url, index) => decodedCode(url, cameraId[index]));
  }
  return urls.map((url) => decodedCode(url, cameraId));
}
