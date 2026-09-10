import { RENDER_QUALITIES } from '../types/viewer.js';
import type {
  RenderConfiguration,
  ViewerCamera,
  ViewerFrame,
  ViewerRenderOptions,
  ViewerViewMode,
} from '../types/viewer.js';
import { resolveCameras } from './cameras.js';
import { buildHashedImagePath } from './image-url-hash.js';

const defaultOmittedKeys = {
  exterior: ['AKZI', 'DHC'],
  interior: ['AKZ'],
} as const;

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

function resolveBaureihe(options: ViewerRenderOptions): string {
  if (options.baureihe !== undefined) {
    validateToken(options.baureihe, 'Baureihe');
    return options.baureihe.toUpperCase();
  }
  const raw = options.configuration?.B;
  const isValidRaw =
    (typeof raw === 'string' && raw.trim() !== '') ||
    (typeof raw === 'number' && Number.isFinite(raw));
  if (!isValidRaw) {
    throw new TypeError(
      'baureihe or configuration.B is required to build hashed image URLs.'
    );
  }
  const token = `B${raw}`.toUpperCase();
  validateToken(token, 'Baureihe');
  return token;
}

export function buildViewerFrames(options: ViewerRenderOptions): {
  exteriorFrames: readonly ViewerFrame[];
  interiorFrames: readonly ViewerFrame[];
} {
  const {
    configuration,
    baseUrl,
    quality = 'FHD',
    thumbnailQuality,
    omittedConfigurationKeys,
  } = options;
  const { exteriorCameras, interiorCameras } = resolveCameras(options);
  const base = normalizeBaseUrl(baseUrl);
  const baureihe = resolveBaureihe(options);
  if (
    !RENDER_QUALITIES.includes(quality) ||
    (thumbnailQuality !== undefined &&
      !RENDER_QUALITIES.includes(thumbnailQuality))
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
      const hashedPath = (renderQuality: string) =>
        `${base}/${buildHashedImagePath(baureihe, `${code}_PQM-${renderQuality}`, camera.id)}`;
      return {
        cameraId: camera.id,
        src: hashedPath(quality),
        zoomSrc: hashedPath(
          quality === 'FHD' || quality === 'WQHD' ? '4K' : quality
        ),
        ...(camera.label === undefined ? {} : { alt: camera.label }),
        ...(thumbnailQuality === undefined
          ? {}
          : {
              thumbnailSrc: hashedPath(thumbnailQuality),
            }),
      };
    });
  }

  return {
    exteriorFrames: build(exteriorCameras, 'exterior'),
    interiorFrames: build(interiorCameras, 'interior'),
  };
}
