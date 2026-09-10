import { DEFAULT_CAMERAS } from '../constants/default-cameras.js';
import type { ViewerCamera, ViewerRenderOptions } from '../types/viewer.js';

const catalog = new Map<string, ViewerCamera>(
  DEFAULT_CAMERAS.map((camera) => [camera.id, camera])
);

/**
 * Resolves the camera list: the full system catalog by default, or the
 * requested subset from `cameras` (system IDs only), in the requested
 * order. `[]` selects no cameras.
 */
export function resolveCameras({
  cameras,
}: Pick<ViewerRenderOptions, 'cameras'>): readonly ViewerCamera[] {
  if (cameras === undefined) return DEFAULT_CAMERAS;
  if (!Array.isArray(cameras))
    throw new TypeError('cameras must be an array of system camera IDs.');
  const selected: ViewerCamera[] = [];
  const seen = new Set<string>();
  for (const id of cameras) {
    const camera = typeof id === 'string' ? catalog.get(id) : undefined;
    if (!camera) throw new RangeError(`Unknown system camera ID: ${String(id)}`);
    if (seen.has(id)) throw new TypeError(`Duplicate camera ID: ${id}`);
    seen.add(id);
    selected.push(camera);
  }
  return selected;
}
