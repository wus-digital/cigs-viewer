'use client';

import { useCallback, useMemo } from 'react';
import { ImageFrameViewer } from './ImageFrameViewer.js';
import { buildViewerFrameConfig } from '../utils/render-frames.js';
import { useProgressiveViewFrames } from '../hooks/useProgressiveViewFrames.js';
import type { CigsViewerProps, ViewerCamera } from '../types/viewer.js';

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
    enableZoom ? config.zoomQuality : undefined,
    config.thumbnailQuality,
    priorityIndex,
    handleGenerateError
  );

  return (
    <ImageFrameViewer
      {...controls}
      {...(cameraId === undefined ? {} : { cameraId })}
      {...(frameIndex === undefined ? {} : { frameIndex })}
      {...(defaultFrameIndex === undefined ? {} : { defaultFrameIndex })}
      enableZoom={enableZoom}
      frames={frames}
    />
  );
}
