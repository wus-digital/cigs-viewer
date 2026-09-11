import { useCallback, useMemo, useState } from 'react';
import { requestGeneratedImages } from '../utils/generate-client.js';
import { cameraToken } from '../utils/resolve-frames.js';
import type { RenderQuality } from '../types/viewer.js';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

interface QualityState {
  requestKey: string;
  requested: ReadonlySet<string>;
  srcByCameraId: Readonly<Record<string, string>>;
}

function initialState(requestKey: string): QualityState {
  return { requestKey, requested: new Set(), srcByCameraId: {} };
}

/**
 * Resolves a single camera's image at a given `quality` on demand via
 * `POST /generate` instead of upfront for every camera at both qualities:
 * nothing is requested until `requestSrc(cameraId)` is called - e.g. once
 * the viewer actually starts wheel-zooming into that camera, or enters
 * fullscreen - and each camera is requested at most once per
 * `baseUrl`/`configuration`/`quality` combination. Concurrent/repeated
 * calls for an already resolved or in-flight camera are no-ops; a failed
 * request is removed from that tracking so the next `requestSrc` call for
 * the same camera retries it. Whenever `configuration` (or
 * `baseUrl`/`quality`) changes, all previously resolved images are stale -
 * since they were rendered for the old configuration - so both the
 * resolved-URL cache and the requested-camera tracking are reset
 * (mirroring the `requestKey` change), letting the next request for a
 * camera fetch a fresh image for the new configuration instead of reusing
 * a stale one.
 */
export function useLazyQualitySrc(
  baseUrl: string,
  configuration: Readonly<Record<string, string>>,
  quality: RenderQuality,
  onError: (error: Error) => void
): {
  srcByCameraId: Readonly<Record<string, string>>;
  requestSrc: (cameraId: string) => void;
} {
  const requestKey = useMemo(
    () => JSON.stringify([baseUrl, configuration, quality]),
    [baseUrl, configuration, quality]
  );
  const [state, setState] = useState<QualityState>(() =>
    initialState(requestKey)
  );
  const current =
    state.requestKey === requestKey ? state : initialState(requestKey);
  if (current !== state) {
    setState(current);
  }

  const requestSrc = useCallback(
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
        { ...configuration, PQM: `-${quality}` },
        [token]
      )
        .then((urls) => {
          const url = urls[token];
          if (!url) return;
          setState((latest) => {
            if (
              latest.requestKey !== requestKey ||
              latest.srcByCameraId[cameraId] === url
            )
              return latest;
            return {
              ...latest,
              srcByCameraId: {
                ...latest.srcByCameraId,
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
    [baseUrl, configuration, quality, onError, requestKey]
  );

  return { srcByCameraId: current.srcByCameraId, requestSrc };
}
