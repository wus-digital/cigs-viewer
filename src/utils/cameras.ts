import {
  EXTERIOR_CAMERAS,
  INTERIOR_CAMERAS,
} from '../constants/default-cameras.js';
import type { ViewerCamera, ViewerRenderOptions } from '../types/viewer.js';

const exterior = new Map<string, ViewerCamera>(
  EXTERIOR_CAMERAS.map((camera) => [camera.id, camera])
);
const interior = new Map<string, ViewerCamera>(
  INTERIOR_CAMERAS.map((camera) => [camera.id, camera])
);

export function resolveCameras({
  cameras,
  exteriorCameras,
  interiorCameras,
}: Pick<
  ViewerRenderOptions,
  'cameras' | 'exteriorCameras' | 'interiorCameras'
>) {
  if (cameras === undefined) {
    return {
      exteriorCameras:
        exteriorCameras === undefined ? EXTERIOR_CAMERAS : exteriorCameras,
      interiorCameras:
        interiorCameras === undefined ? INTERIOR_CAMERAS : interiorCameras,
    };
  }
  if (exteriorCameras !== undefined || interiorCameras !== undefined) {
    throw new TypeError(
      'Use cameras or the legacy per-view camera lists, not both.'
    );
  }
  if (!Array.isArray(cameras))
    throw new TypeError('cameras must be an array of system camera IDs.');
  const selectedExterior: ViewerCamera[] = [];
  const selectedInterior: ViewerCamera[] = [];
  const seen = new Set<string>();
  for (const id of cameras) {
    if (typeof id !== 'string' || (!exterior.has(id) && !interior.has(id))) {
      throw new RangeError(`Unknown system camera ID: ${String(id)}`);
    }
    if (seen.has(id)) throw new TypeError(`Duplicate camera ID: ${id}`);
    seen.add(id);
    const exteriorCamera = exterior.get(id);
    const interiorCamera = interior.get(id);
    if (exteriorCamera) selectedExterior.push(exteriorCamera);
    if (interiorCamera) selectedInterior.push(interiorCamera);
  }
  return {
    exteriorCameras: selectedExterior,
    interiorCameras: selectedInterior,
  };
}
