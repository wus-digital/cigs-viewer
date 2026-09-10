import { requestGeneratedImages } from './generate-client.js';
import type {
  RenderQuality,
  ViewerCamera,
  ViewerFrame,
} from '../types/viewer.js';
import type { ViewerFramesConfig } from './render-frames.js';

type CamerasAndConfiguration = Pick<ViewerFramesConfig, 'cameras' | 'configuration'>;

/** `POST /generate`'s camera entries are the camera ID without its leading `C` (the service re-adds it itself). */
function cameraToken(cameraId: string): string {
  return cameraId.replace(/^C/i, '');
}

function requireUrl(
  urls: Readonly<Record<string, string>>,
  token: string,
  quality: RenderQuality
): string {
  const url = urls[token];
  if (typeof url !== 'string' || !url) {
    throw new Error(
      `/generate did not return an image URL for camera "${token}" at quality "${quality}".`
    );
  }
  return url;
}

/** A same-origin, zero-network 1x1 transparent GIF used until a camera's real image URL is known. */
export const PENDING_FRAME_SRC =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

/**
 * Splits `count` camera indices into priority batches around
 * `priorityIndex`, treating the camera list as a **loop** (matching the
 * viewer's own wraparound navigation): `[priorityIndex]` first, then its
 * immediate neighbors on each side, then the next ones out, and so on,
 * wrapping past either end until every index has been covered exactly
 * once. E.g. for a 9-camera list starting at index 1: `[1]`, `[0, 2]`,
 * `[8, 3]`, `[7, 4]`, `[6, 5]`.
 */
export function priorityBatches(
  count: number,
  priorityIndex: number
): number[][] {
  if (count === 0) return [];
  const start = ((priorityIndex % count) + count) % count;
  const included = new Set([start]);
  const batches: number[][] = [[start]];
  for (let offset = 1; included.size < count; offset++) {
    const left = ((start - offset) % count + count) % count;
    const right = (start + offset) % count;
    const batch: number[] = [];
    if (!included.has(left)) {
      included.add(left);
      batch.push(left);
    }
    if (right !== left && !included.has(right)) {
      included.add(right);
      batch.push(right);
    }
    if (batch.length) batches.push(batch);
  }
  return batches;
}

/** The full-length placeholder `ViewerFrame[]` for `cameras`, before any of them has resolved. */
export function createPendingFrames(
  cameras: CamerasAndConfiguration['cameras']
): ViewerFrame[] {
  return cameras.map((camera) => ({
    cameraId: camera.id,
    src: PENDING_FRAME_SRC,
    ...(camera.label === undefined ? {} : { alt: camera.label }),
  }));
}

/**
 * Resolves one view's `ViewerFrame[]` progressively instead of waiting for
 * every camera at once: `onUpdate` first receives the full-length array with
 * every not-yet-known frame set to `PENDING_FRAME_SRC` (so navigation and the
 * frame count work immediately), then again after each priority batch
 * (`priorityIndex` first, then its neighbors, expanding outward - see
 * `priorityBatches`) as that batch's `POST /generate` call resolves, up to
 * `maxCameras` resolved cameras (use `Infinity` to resolve every camera).
 * Frames already applied via `onUpdate` stay in place even if a later
 * batch's call rejects; the returned promise rejects with that batch's
 * error once every eligible batch has either resolved or failed.
 */
export async function resolveViewFramesProgressively(
  baseUrl: string,
  view: CamerasAndConfiguration,
  quality: RenderQuality,
  zoomQuality: RenderQuality | undefined,
  thumbnailQuality: RenderQuality | undefined,
  priorityIndex: number,
  maxCameras: number,
  onUpdate: (frames: readonly ViewerFrame[]) => void
): Promise<void> {
  const { cameras } = view;
  if (cameras.length === 0) {
    onUpdate([]);
    return;
  }
  const frames = createPendingFrames(cameras);
  onUpdate(frames.slice());

  const cap = Math.min(maxCameras, cameras.length);
  let resolvedCount = 0;
  let firstError: unknown;
  for (const batchIndices of priorityBatches(cameras.length, priorityIndex)) {
    if (resolvedCount >= cap) break;
    try {
      const batchFrames = await resolveViewFrames(
        baseUrl,
        {
          cameras: batchIndices.map((index) => cameras[index] as ViewerCamera),
          configuration: view.configuration,
        },
        quality,
        zoomQuality,
        thumbnailQuality
      );
      batchIndices.forEach((cameraIndex, i) => {
        frames[cameraIndex] = batchFrames[i] as ViewerFrame;
      });
      resolvedCount += batchIndices.length;
      onUpdate(frames.slice());
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError !== undefined) throw firstError;
}

/**
 * Resolves one view's `ViewerFrame[]` by calling `POST /generate` (once per
 * distinct quality actually needed - `quality`, `zoomQuality` and
 * `thumbnailQuality` share a call whenever they're equal) and zipping the
 * returned `{ [cameraToken]: url }` maps back into frames, preserving
 * camera order and labels. Resolves to `[]` without any network call when
 * the view has no cameras.
 */
export async function resolveViewFrames(
  baseUrl: string,
  view: CamerasAndConfiguration,
  quality: RenderQuality,
  zoomQuality: RenderQuality | undefined,
  thumbnailQuality: RenderQuality | undefined
): Promise<ViewerFrame[]> {
  const { cameras, configuration } = view;
  if (cameras.length === 0) return [];
  const tokens = cameras.map((camera) => cameraToken(camera.id));

  const pendingByQuality = new Map<
    RenderQuality,
    Promise<Readonly<Record<string, string>>>
  >();
  function urlsFor(
    renderQuality: RenderQuality
  ): Promise<Readonly<Record<string, string>>> {
    let pending = pendingByQuality.get(renderQuality);
    if (!pending) {
      pending = requestGeneratedImages(
        baseUrl,
        { ...configuration, PQM: `-${renderQuality}` },
        tokens
      );
      pendingByQuality.set(renderQuality, pending);
    }
    return pending;
  }

  const [srcUrls, zoomUrls, thumbnailUrls] = await Promise.all([
    urlsFor(quality),
    zoomQuality === undefined
      ? Promise.resolve(undefined)
      : urlsFor(zoomQuality),
    thumbnailQuality === undefined
      ? Promise.resolve(undefined)
      : urlsFor(thumbnailQuality),
  ]);

  return cameras.map((camera, index) => {
    const token = tokens[index] as string;
    return {
      cameraId: camera.id,
      src: requireUrl(srcUrls, token, quality),
      ...(zoomUrls === undefined
        ? {}
        : {
            zoomSrc: requireUrl(
              zoomUrls,
              token,
              zoomQuality as RenderQuality
            ),
          }),
      ...(camera.label === undefined ? {} : { alt: camera.label }),
      ...(thumbnailUrls === undefined
        ? {}
        : {
            thumbnailSrc: requireUrl(
              thumbnailUrls,
              token,
              thumbnailQuality as RenderQuality
            ),
          }),
    };
  });
}
