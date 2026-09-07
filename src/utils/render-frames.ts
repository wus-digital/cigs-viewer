import type {
  RenderConfiguration,
  RenderQuality,
  ViewerCamera,
  ViewerFrame,
  ViewerRenderOptions,
  ViewerViewMode,
} from '../types/viewer.js';
import {
  DEFAULT_EXTERIOR_CAMERAS,
  DEFAULT_INTERIOR_CAMERAS,
} from '../constants/default-cameras.js';

const defaultOmittedKeys = {
  exterior: ['AKZI', 'DHC'],
  interior: ['AKZ'],
} as const;

const qualities: readonly RenderQuality[] = [
  'FHD',
  'WQHD',
  '4K',
  '4KHQ',
  '8K',
  '8KHQ',
];

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

function buildRenderCode(
  configuration: RenderConfiguration,
  omittedKeys: readonly string[]
): string {
  if (
    !configuration ||
    typeof configuration !== 'object' ||
    Array.isArray(configuration) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(configuration))
  ) {
    throw new TypeError('configuration must be a key-value object.');
  }
  if (
    !Array.isArray(omittedKeys) ||
    omittedKeys.some((key) => typeof key !== 'string')
  ) {
    throw new TypeError(
      'omittedConfigurationKeys must contain arrays of keys.'
    );
  }
  const omitted = new Set(omittedKeys);
  const codes: string[] = [];
  // Preserve the host's insertion order: the existing CIGS URLs are not sorted.
  for (const [key, value] of Object.entries(configuration)) {
    if (
      omitted.has(key) ||
      value === '' ||
      value === undefined ||
      value === null
    )
      continue;
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
    codes.push(`${key}${token}`);
  }
  if (codes.length === 0)
    throw new TypeError(
      'configuration must contain at least one render code after filtering.'
    );
  return codes.join('_');
}

export function buildViewerFrames(options: ViewerRenderOptions): {
  exteriorFrames: readonly ViewerFrame[];
  interiorFrames: readonly ViewerFrame[];
} {
  const {
    configuration,
    baseUrl,
    exteriorCameras = DEFAULT_EXTERIOR_CAMERAS,
    interiorCameras = DEFAULT_INTERIOR_CAMERAS,
    quality = 'FHD',
    thumbnailQuality,
    omittedConfigurationKeys,
  } = options;
  const base = normalizeBaseUrl(baseUrl);
  if (
    !qualities.includes(quality) ||
    (thumbnailQuality !== undefined && !qualities.includes(thumbnailQuality))
  ) {
    throw new TypeError('Unsupported render quality.');
  }

  function build(
    cameras: readonly ViewerCamera[],
    viewMode: ViewerViewMode
  ): ViewerFrame[] {
    if (!Array.isArray(cameras))
      throw new TypeError(`${viewMode}Cameras must be an array.`);
    const code = buildRenderCode(
      configuration,
      omittedConfigurationKeys?.[viewMode] ?? defaultOmittedKeys[viewMode]
    );
    const ids = new Set<string>();
    return cameras.map((camera) => {
      validateToken(camera?.id, 'Camera ID');
      if (ids.has(camera.id))
        throw new TypeError(`Duplicate ${viewMode} camera ID: ${camera.id}`);
      ids.add(camera.id);
      return {
        cameraId: camera.id,
        src: `${base}/${code}_${camera.id}_PQM-${quality}.webp`,
        ...(camera.label === undefined ? {} : { alt: camera.label }),
        ...(thumbnailQuality === undefined
          ? {}
          : {
              thumbnailSrc: `${base}/${code}_${camera.id}_PQM-${thumbnailQuality}.webp`,
            }),
      };
    });
  }

  return {
    exteriorFrames: build(exteriorCameras, 'exterior'),
    interiorFrames: build(interiorCameras, 'interior'),
  };
}
