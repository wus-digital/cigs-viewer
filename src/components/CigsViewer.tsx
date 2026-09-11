'use client';

import { useCallback, useMemo } from 'react';
import { ImageFrameViewer } from './ImageFrameViewer.js';
import { buildViewerFrameConfig } from '../utils/render-frames.js';
import { useProgressiveViewFrames } from '../hooks/useProgressiveViewFrames.js';
import { useLazyQualitySrc } from '../hooks/useLazyQualitySrc.js';
import { resolveDefaultCameraId } from '../utils/frames.js';
import type {
  CigsViewerProps,
  ViewerCamera,
  ViewerFrame,
  ViewerFrameChange,
} from '../types/viewer.js';

/**
 * The camera index to fetch first: the requested `cameraId` if it exists,
 * else `frameIndex`/`defaultFrameIndex` clamped into range, else the
 * resolved `defaultCamera` (falling back to `IMPLICIT_DEFAULT_CAMERA_ID`,
 * then the first camera) - matches how `ImageFrameViewer` itself picks the
 * initial frame, so the very first `POST /generate` call is for whichever
 * camera actually renders first.
 */
function resolvePriorityIndex(
  cameras: readonly ViewerCamera[],
  cameraId: string | undefined,
  defaultCamera: string | undefined,
  frameIndex: number | undefined
): number {
  if (cameraId !== undefined) {
    const index = cameras.findIndex((camera) => camera.id === cameraId);
    if (index !== -1) return index;
  }
  if (frameIndex !== undefined && Number.isFinite(frameIndex)) {
    return Math.max(0, Math.min(frameIndex, cameras.length - 1));
  }
  const effectiveDefaultCamera = resolveDefaultCameraId(
    cameras.map((camera) => camera.id),
    defaultCamera
  );
  if (effectiveDefaultCamera !== undefined) {
    const index = cameras.findIndex(
      (camera) => camera.id === effectiveDefaultCamera
    );
    if (index !== -1) return index;
  }
  return 0;
}

export function CigsViewer({
  configuration,
  baseUrl,
  cameras,
  quality = 'FHD',
  thumbnailQuality,
  zoomQuality,
  fullscreenQuality,
  fullscreenZoomQuality,
  enableZoom = false,
  onGenerateError,
  cameraId,
  frameIndex,
  defaultFrameIndex,
  defaultCamera,
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
        ...(zoomQuality === undefined ? {} : { zoomQuality }),
        ...(fullscreenQuality === undefined ? {} : { fullscreenQuality }),
        ...(fullscreenZoomQuality === undefined
          ? {}
          : { fullscreenZoomQuality }),
      }),
    [
      configuration,
      baseUrl,
      cameras,
      quality,
      thumbnailQuality,
      zoomQuality,
      fullscreenQuality,
      fullscreenZoomQuality,
    ]
  );

  const priorityIndex = resolvePriorityIndex(
    config.cameras,
    cameraId,
    defaultCamera,
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
    // camera; see `useLazyQualitySrc` below, which resolves it on demand
    // only once the user actually starts zooming into a given camera.
    undefined,
    config.thumbnailQuality,
    priorityIndex,
    handleGenerateError
  );

  const { srcByCameraId: zoomSrcByCameraId, requestSrc: requestZoom } =
    useLazyQualitySrc(
      config.baseUrl,
      config.configuration,
      config.zoomQuality,
      handleGenerateError
    );

  const { srcByCameraId: fullscreenSrcByCameraId, requestSrc: requestFullscreen } =
    useLazyQualitySrc(
      config.baseUrl,
      config.configuration,
      config.fullscreenQuality,
      handleGenerateError
    );

  const {
    srcByCameraId: fullscreenZoomSrcByCameraId,
    requestSrc: requestFullscreenZoom,
  } = useLazyQualitySrc(
    config.baseUrl,
    config.configuration,
    config.fullscreenZoomQuality,
    handleGenerateError
  );

  const framesWithZoom = useMemo<readonly ViewerFrame[]>(() => {
    // Note: this can't gate on the `enableZoom` prop - zoom can also be
    // enabled purely by entering fullscreen (see `useViewerController`'s
    // `effectiveEnableZoom`), which this component has no visibility into.
    // Skipping the merge whenever there's nothing to merge keeps this a
    // no-op until a zoom-, fullscreen- or fullscreen-zoom-quality image
    // has actually resolved either way.
    if (
      Object.keys(zoomSrcByCameraId).length === 0 &&
      Object.keys(fullscreenSrcByCameraId).length === 0 &&
      Object.keys(fullscreenZoomSrcByCameraId).length === 0
    )
      return frames;
    return frames.map((frame) => {
      const zoomSrc = zoomSrcByCameraId[frame.cameraId];
      const fullscreenSrc = fullscreenSrcByCameraId[frame.cameraId];
      const fullscreenZoomSrc = fullscreenZoomSrcByCameraId[frame.cameraId];
      if (!zoomSrc && !fullscreenSrc && !fullscreenZoomSrc) return frame;
      return {
        ...frame,
        ...(zoomSrc ? { zoomSrc } : {}),
        ...(fullscreenSrc ? { fullscreenSrc } : {}),
        ...(fullscreenZoomSrc ? { fullscreenZoomSrc } : {}),
      };
    });
  }, [
    frames,
    zoomSrcByCameraId,
    fullscreenSrcByCameraId,
    fullscreenZoomSrcByCameraId,
  ]);

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

  const handleFullscreenRequest = useCallback(
    ({ frame }: ViewerFrameChange) => {
      // Nothing to fetch when the fullscreen quality matches the base
      // quality already shown - the base image is reused in that case.
      if (config.fullscreenQuality === config.quality) return;
      requestFullscreen(frame.cameraId);
    },
    [requestFullscreen, config.fullscreenQuality, config.quality]
  );

  const handleFullscreenZoomRequest = useCallback(
    ({ frame }: ViewerFrameChange) => {
      // Nothing to fetch when the fullscreen-zoom quality matches the
      // fullscreen quality already shown - that image is reused in that
      // case (the default `fullscreenZoomQuality` behavior).
      if (config.fullscreenZoomQuality === config.fullscreenQuality) return;
      requestFullscreenZoom(frame.cameraId);
    },
    [
      requestFullscreenZoom,
      config.fullscreenZoomQuality,
      config.fullscreenQuality,
    ]
  );

  return (
    <ImageFrameViewer
      {...controls}
      {...(cameraId === undefined ? {} : { cameraId })}
      {...(frameIndex === undefined ? {} : { frameIndex })}
      {...(defaultFrameIndex === undefined ? {} : { defaultFrameIndex })}
      {...(defaultCamera === undefined ? {} : { defaultCamera })}
      enableZoom={enableZoom}
      frames={framesWithZoom}
      onZoomRequest={handleZoomRequest}
      onFullscreenRequest={handleFullscreenRequest}
      onFullscreenZoomRequest={handleFullscreenZoomRequest}
    />
  );
}
