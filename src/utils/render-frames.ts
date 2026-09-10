import { RENDER_QUALITIES } from '../types/viewer.js';
import type {
  RenderConfiguration,
  RenderQuality,
  ViewerCamera,
  ViewerRenderOptions,
} from '../types/viewer.js';
import { resolveCameras } from './cameras.js';

function validateToken(value: string, name: string) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new TypeError(
      `${name} must contain only letters, digits, underscores or hyphens.`
    );
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  if (
    typeof baseUrl !== 'string' ||
    !baseUrl.trim() ||
    baseUrl !== baseUrl.trim()
  ) {
    throw new TypeError(
      'baseUrl must be a non-empty HTTP(S) URL or root-relative directory.'
    );
  }
  if (/[?#\\]/.test(baseUrl) || baseUrl.startsWith('//')) {
    throw new TypeError(
      'baseUrl must not contain query strings, hashes, backslashes or protocol-relative URLs.'
    );
  }
  const url = new URL(baseUrl, 'https://viewer.invalid');
  if (
    (!baseUrl.startsWith('/') && !/^https?:\/\//.test(baseUrl)) ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new TypeError(
      'baseUrl must be HTTP(S) or root-relative and must not contain credentials.'
    );
  }
  return baseUrl.replace(/\/+$/, '');
}

function buildConfigurationEntries(
  configuration: RenderConfiguration
): [string, string][] {
  if (
    !configuration ||
    typeof configuration !== 'object' ||
    Array.isArray(configuration) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(configuration))
  ) {
    throw new TypeError('configuration must be a key-value object.');
  }
  const entries: [string, string][] = [];
  // Preserve the host's insertion order and every key as-is: the viewer
  // never decides which configuration keys to include or omit, it forwards
  // the full configuration to POST /generate untouched (empty/undefined/null
  // values are skipped since they aren't valid render tokens, not filtered
  // out by choice).
  for (const [key, value] of Object.entries(configuration)) {
    if (value === '' || value === undefined || value === null) continue;
    validateToken(key, 'Configuration key');
    if (
      typeof value !== 'string' &&
      (typeof value !== 'number' || !Number.isFinite(value))
    ) {
      throw new TypeError(
        'Configuration values must be strings or finite numbers.'
      );
    }
    const token = String(value);
    validateToken(token, 'Configuration value');
    entries.push([key, token]);
  }
  if (entries.length === 0)
    throw new TypeError(
      'configuration must contain at least one render code after filtering.'
    );
  return entries;
}

/** Validated input for `POST /generate`: the resolved camera list and filtered configuration object. */
export interface ViewerFramesConfig {
  baseUrl: string;
  quality: RenderQuality;
  /** Quality requested for `zoomSrc`: `4K` for `FHD`/`WQHD`, otherwise the same as `quality`. */
  zoomQuality: RenderQuality;
  thumbnailQuality?: RenderQuality;
  cameras: readonly ViewerCamera[];
  configuration: Readonly<Record<string, string>>;
}

/**
 * Validates viewer options and resolves everything needed to fetch every
 * camera's image from `POST /generate` (filtered configuration + camera
 * list). Fully synchronous - it never calls the network, it only prepares
 * the request material `resolveViewFrames`/`resolveViewFramesProgressively`
 * send to the CIGS render service.
 */
export function buildViewerFrameConfig(
  options: ViewerRenderOptions
): ViewerFramesConfig {
  const {
    configuration,
    baseUrl,
    quality = 'FHD',
    thumbnailQuality,
  } = options;
  const cameras = resolveCameras(options);
  const base = normalizeBaseUrl(baseUrl);
  if (
    !RENDER_QUALITIES.includes(quality) ||
    (thumbnailQuality !== undefined &&
      !RENDER_QUALITIES.includes(thumbnailQuality))
  ) {
    throw new TypeError('Unsupported render quality.');
  }
  const entries = buildConfigurationEntries(configuration);
  const ids = new Set<string>();
  for (const camera of cameras) {
    validateToken(camera?.id, 'Camera ID');
    if (ids.has(camera.id)) throw new TypeError(`Duplicate camera ID: ${camera.id}`);
    ids.add(camera.id);
  }

  return {
    baseUrl: base,
    quality,
    zoomQuality: quality === 'FHD' || quality === 'WQHD' ? '4K' : quality,
    ...(thumbnailQuality === undefined ? {} : { thumbnailQuality }),
    cameras,
    configuration: Object.fromEntries(entries),
  };
}
