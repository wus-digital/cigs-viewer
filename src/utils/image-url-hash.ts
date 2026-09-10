import { deflateRaw } from 'pako';

/**
 * Mirrors the CIGS render service's `encodeConfigurationCodeToUrlHash` 1:1
 * (see wus-digital/cigs `src/hash.util.ts`) so hashed URLs built here are
 * decodable by the backend without any additional lookup.
 *
 * The camera is deliberately **not** part of the hash payload: all cameras of
 * a configuration share the same hash and only differ in the `_${cameraId}`
 * suffix appended after it, matching the backend's
 * `${baureihe}_${hash}_C${kamera}.webp` key format.
 */
const URL_HASH_PREFIX = 'h1';
const URL_HASH_PAYLOAD_PREFIX = 'cfg:v1:';

function normalizeConfigurationCodeForUrlHash(configurationCode: string): string {
  return configurationCode
    .replace('.webp', '')
    .split('_')
    .filter(Boolean)
    .join('_');
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // `btoa` is a global in both browsers and Node.js 18+ (our minimum is 20.9).
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Encodes a plain-text configuration code, **without the camera token**,
 * (e.g. `B01_M01_P070707_PQM-FHD`) into the short, reversible `h1...` hash
 * used by the CIGS render service.
 */
export function encodeConfigurationCodeToUrlHash(
  configurationCodeWithoutCamera: string
): string {
  const normalizedConfigurationCode = normalizeConfigurationCodeForUrlHash(
    configurationCodeWithoutCamera
  );
  const payload = `${URL_HASH_PAYLOAD_PREFIX}${normalizedConfigurationCode}`;
  const compressedPayload = deflateRaw(new TextEncoder().encode(payload), {
    level: 9,
  });
  return `${URL_HASH_PREFIX}${toBase64Url(compressedPayload)}`;
}

/**
 * Builds the final hashed image path: `/${baureihe}_${hash}_${cameraId}.webp`.
 * `configurationCodeWithoutCamera` must already exclude the camera token —
 * the camera is appended as a plain suffix after the hash instead of being
 * part of the compressed payload, so every camera of a configuration shares
 * the same hash.
 */
export function buildHashedImagePath(
  baureihe: string,
  configurationCodeWithoutCamera: string,
  cameraId: string
): string {
  const hash = encodeConfigurationCodeToUrlHash(configurationCodeWithoutCamera);
  return `${baureihe}_${hash}_${cameraId}.webp`;
}
