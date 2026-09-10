import { useCallback, useMemo, useState } from 'react';
import { requestGeneratedImages } from '../utils/generate-client.js';
import { cameraToken } from '../utils/resolve-frames.js';
import type { RenderQuality } from '../types/viewer.js';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

interface ZoomState {
  requestKey: string;
  requested: ReadonlySet<string>;
  zoomSrcByCameraId: Readonly<Record<string, string>>;
}

function initialState(requestKey: string): ZoomState {
  return { requestKey, requested: new Set(), zoomSrcByCameraId: {} };
}

/**
 * Resolves a single camera's zoom-quality image on demand via `POST
 * /generate` instead of upfront for every camera at both qualities:
 * nothing is requested until `requestZoom(cameraId)` is called - i.e. once
 * the viewer actually starts wheel-zooming into that camera - and each
 * camera is requested at most once per `baseUrl`/`configuration`/
 * `zoomQuality` combination. Concurrent/repeated calls for an already
 * resolved or in-flight camera are no-ops; a failed request is removed
 * from that tracking so the next `requestZoom` call for the same camera
 * retries it. Whenever `configuration` (or `baseUrl`/`zoomQuality`)
 * changes, all previously resolved zoom images are stale - since they
 * were rendered for the old configuration - so both the resolved-URL
 * cache and the requested-camera tracking are reset (mirroring the
 * `requestKey` change), letting the next zoom-in for a camera fetch a
 * fresh image for the new configuration instead of reusing a stale one.
 */
export function useLazyZoomSrc(
  baseUrl: string,
  configuration: Readonly<Record<string, string>>,
  zoomQuality: RenderQuality,
  onError: (error: Error) => void
): {
  zoomSrcByCameraId: Readonly<Record<string, string>>;
  requestZoom: (cameraId: string) => void;
} {
  const requestKey = useMemo(
    () => JSON.stringify([baseUrl, configuration, zoomQuality]),
    [baseUrl, configuration, zoomQuality]
  );
  const [state, setState] = useState<ZoomState>(() => initialState(requestKey));
  const current =
    state.requestKey === requestKey ? state : initialState(requestKey);
  if (current !== state) {
    setState(current);
  }

  const requestZoom = useCallback(
    (cameraId: string) => {
      let shouldFetch = false;
      setState((latest) => {
        const base =
          latest.requestKey === requestKey ? latest : initialState(requestKey);
        if (base.requested.has(cameraId)) return base;
        shouldFetch = true;
        return { ...base, requested: new Set(base.requested).add(cameraId) };
      });
      if (!shouldFetch) return;
      const token = cameraToken(cameraId);
      requestGeneratedImages(
        baseUrl,
        { ...configuration, PQM: `-${zoomQuality}` },
        [token]
      )
        .then((urls) => {
          const url = urls[token];
          if (!url) return;
          setState((latest) => {
            if (
              latest.requestKey !== requestKey ||
              latest.zoomSrcByCameraId[cameraId] === url
            )
              return latest;
            return {
              ...latest,
              zoomSrcByCameraId: {
                ...latest.zoomSrcByCameraId,
                [cameraId]: url,
              },
            };
          });
        })
        .catch((error: unknown) => {
          setState((latest) => {
            if (
              latest.requestKey !== requestKey ||
              !latest.requested.has(cameraId)
            )
              return latest;
            const requested = new Set(latest.requested);
            requested.delete(cameraId);
            return { ...latest, requested };
          });
          onError(toError(error));
        });
    },
    [baseUrl, configuration, zoomQuality, onError, requestKey]
  );

  return { zoomSrcByCameraId: current.zoomSrcByCameraId, requestZoom };
}
