import { useEffect, useRef, useState } from 'react';
import {
  PENDING_FRAME_SRC,
  resolveViewFramesProgressively,
} from '../utils/resolve-frames.js';
import type { RenderQuality, ViewerFrame } from '../types/viewer.js';
import type { ViewerFramesConfig } from '../utils/render-frames.js';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Resolves every camera's frame from `POST /generate` progressively: the
 * requested (or default) camera first, then its neighbors outward - see
 * `priorityBatches` - so the currently displayed camera never waits on the
 * rest of the catalog.
 *
 * A change to `cameras`/`configuration`/the qualities re-resolves every
 * camera, but a camera whose new image isn't back yet keeps showing its
 * last successfully resolved image (matched by `cameraId`) instead of
 * flashing to the pending placeholder - `FrameImage`'s own crossfade then
 * takes over once the real new URL arrives, exactly like a normal src
 * change. Only a camera that has never resolved before (first mount, or
 * newly added to the selection) shows the placeholder.
 */
export function useProgressiveViewFrames(
  baseUrl: string,
  view: Pick<ViewerFramesConfig, 'cameras' | 'configuration'>,
  quality: RenderQuality,
  zoomQuality: RenderQuality | undefined,
  thumbnailQuality: RenderQuality | undefined,
  priorityIndex: number,
  onError: (error: Error) => void
): readonly ViewerFrame[] {
  const [frames, setFrames] = useState<readonly ViewerFrame[]>([]);
  const lastGoodByCameraId = useRef(new Map<string, ViewerFrame>());

  useEffect(() => {
    let cancelled = false;
    resolveViewFramesProgressively(
      baseUrl,
      view,
      quality,
      zoomQuality,
      thumbnailQuality,
      priorityIndex,
      Infinity,
      (nextFrames) => {
        if (cancelled) return;
        const merged = nextFrames.map((frame) => {
          if (frame.src !== PENDING_FRAME_SRC) {
            lastGoodByCameraId.current.set(frame.cameraId, frame);
            return frame;
          }
          return lastGoodByCameraId.current.get(frame.cameraId) ?? frame;
        });
        setFrames(merged);
      }
    ).catch((error: unknown) => {
      if (!cancelled) onError(toError(error));
    });
    return () => {
      cancelled = true;
    };
  }, [
    baseUrl,
    view,
    quality,
    zoomQuality,
    thumbnailQuality,
    priorityIndex,
    onError,
  ]);

  return frames;
}
