'use client';

import { useCallback, useMemo } from 'react';
import { ImageFrameViewer } from './ImageFrameViewer.js';
import { buildViewerFrameConfig } from '../utils/render-frames.js';
import { useProgressiveViewFrames } from '../hooks/useProgressiveViewFrames.js';
import { useLazyZoomSrc } from '../hooks/useLazyZoomSrc.js';
import type {
  CigsViewerProps,
  ViewerCamera,
  ViewerFrame,
  ViewerFrameChange,
} from '../types/viewer.js';

/**
 * The camera index to fetch first: the requested `cameraId` if it exists,
 * else `frameIndex` clamped into range, else `0` (the first camera) -
 * matches how `ImageFrameViewer` itself picks the initial frame, so the
 * very first `POST /generate` call is for whichever camera actually
 * renders first.
 */
function resolvePriorityIndex(
  cameras: readonly ViewerCamera[],
  cameraId: string | undefined,
  frameIndex: number | undefined
): number {
  if (cameraId !== undefined) {
    const index = cameras.findIndex((camera) => camera.id === cameraId);
    if (index !== -1) return index;
  }
  if (frameIndex !== undefined && Number.isFinite(frameIndex)) {
    return Math.max(0, Math.min(frameIndex, cameras.length - 1));
  }
  return 0;
}

export function CigsViewer({
  configuration,
  baseUrl,
  cameras,
  quality = 'FHD',
  thumbnailQuality,
  enableZoom = false,
  onGenerateError,
  cameraId,
  frameIndex,
  defaultFrameIndex,
  ...controls
}: CigsViewerProps) {
  const config = useMemo(
    () =>
      buildViewerFrameConfig({
        configuration,
        baseUrl,
        ...(cameras === undefined ? {} : { cameras }),
        quality,
        ...(thumbnailQuality === undefined ? {} : { thumbnailQuality }),
      }),
    [configuration, baseUrl, cameras, quality, thumbnailQuality]
  );

  const priorityIndex = resolvePriorityIndex(
    config.cameras,
    cameraId,
    frameIndex ?? defaultFrameIndex
  );

  const handleGenerateError = useCallback(
    (error: Error) => onGenerateError?.(error),
    [onGenerateError]
  );

  const frames = useProgressiveViewFrames(
    config.baseUrl,
    config,
    config.quality,
    // The zoom-quality image is no longer fetched upfront for every
    // camera; see `useLazyZoomSrc` below, which resolves it on demand
    // only once the user actually starts zooming into a given camera.
    undefined,
    config.thumbnailQuality,
    priorityIndex,
    handleGenerateError
  );

  const { zoomSrcByCameraId, requestZoom } = useLazyZoomSrc(
    config.baseUrl,
    config.configuration,
    config.zoomQuality,
    handleGenerateError
  );

  const framesWithZoom = useMemo<readonly ViewerFrame[]>(() => {
    // Note: this can't gate on the `enableZoom` prop - zoom can also be
    // enabled purely by entering fullscreen (see `useViewerController`'s
    // `effectiveEnableZoom`), which this component has no visibility into.
    // Skipping the merge whenever there's nothing to merge keeps this a
    // no-op until a zoom-quality image has actually resolved either way.
    if (Object.keys(zoomSrcByCameraId).length === 0) return frames;
    return frames.map((frame) => {
      const zoomSrc = zoomSrcByCameraId[frame.cameraId];
      return zoomSrc ? { ...frame, zoomSrc } : frame;
    });
  }, [frames, zoomSrcByCameraId]);

  const handleZoomRequest = useCallback(
    ({ frame }: ViewerFrameChange) => {
      // Nothing to fetch when the zoom quality matches the base quality
      // already shown (e.g. quality is already `4K` or higher) - the base
      // image is reused for zooming in that case.
      if (config.zoomQuality === config.quality) return;
      requestZoom(frame.cameraId);
    },
    [requestZoom, config.zoomQuality, config.quality]
  );

  return (
    <ImageFrameViewer
      {...controls}
      {...(cameraId === undefined ? {} : { cameraId })}
      {...(frameIndex === undefined ? {} : { frameIndex })}
      {...(defaultFrameIndex === undefined ? {} : { defaultFrameIndex })}
      enableZoom={enableZoom}
      frames={framesWithZoom}
      onZoomRequest={handleZoomRequest}
    />
  );
}
