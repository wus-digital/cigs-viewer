'use client';

import { useMemo, useState } from 'react';
import { ImageSequence } from './ImageSequence.js';
import { defaultLabels } from '../constants/default-labels.js';
import { rootClasses } from '../constants/tailwind.js';
import { slotClasses } from '../utils/classes.js';
import {
  normalizeFrame,
  resolveDefaultCameraId,
  validateFrames,
  validateInteger,
} from '../utils/frames.js';
import type { ImageFrameViewerProps } from '../types/viewer.js';

export function ImageFrameViewer({
  frames,
  frameIndex,
  cameraId,
  defaultFrameIndex,
  defaultCamera,
  onFrameChange,
  onImageError,
  onZoomRequest,
  onFullscreenRequest,
  onFullscreenZoomRequest,
  loop = true,
  dragMode = 'slide',
  pixelsPerFrame = 24,
  preloadRadius = 'all',
  showThumbnails = true,
  fullscreenShowThumbnails,
  allowFullscreen = true,
  fullscreenIcon,
  actions,
  enableZoom = false,
  enableFullscreenZoom = true,
  maxZoom = 4,
  fullscreenMaxZoom,
  labels: customLabels,
  className,
  classNames,
  children,
  style,
}: ImageFrameViewerProps) {
  const [internalIndex, setInternalIndex] = useState(defaultFrameIndex ?? 0);
  const [defaultCameraApplied, setDefaultCameraApplied] = useState(false);

  useMemo(() => validateFrames(frames, 'frames'), [frames]);
  if (defaultCamera !== undefined && defaultFrameIndex !== undefined) {
    throw new TypeError(
      'Use either defaultCamera or defaultFrameIndex, not both.'
    );
  }
  validateInteger(defaultFrameIndex ?? 0, 'defaultFrameIndex', 0);
  if (frameIndex !== undefined) validateInteger(frameIndex, 'frameIndex', 0);
  if (preloadRadius !== 'all')
    validateInteger(preloadRadius, 'preloadRadius', 0, 4);
  validateInteger(pixelsPerFrame, 'pixelsPerFrame', 1);
  if (typeof enableZoom !== 'boolean') {
    throw new TypeError('enableZoom must be a boolean.');
  }
  if (typeof enableFullscreenZoom !== 'boolean') {
    throw new TypeError('enableFullscreenZoom must be a boolean.');
  }
  if (typeof allowFullscreen !== 'boolean') {
    throw new TypeError('allowFullscreen must be a boolean.');
  }
  if (typeof maxZoom !== 'number' || !Number.isFinite(maxZoom) || maxZoom < 1) {
    throw new TypeError(
      'maxZoom must be a finite number greater than or equal to 1.'
    );
  }
  if (
    fullscreenMaxZoom !== undefined &&
    (typeof fullscreenMaxZoom !== 'number' ||
      !Number.isFinite(fullscreenMaxZoom) ||
      fullscreenMaxZoom < 1)
  ) {
    throw new TypeError(
      'fullscreenMaxZoom must be a finite number greater than or equal to 1.'
    );
  }
  if (
    fullscreenShowThumbnails !== undefined &&
    typeof fullscreenShowThumbnails !== 'boolean'
  ) {
    throw new TypeError('fullscreenShowThumbnails must be a boolean.');
  }
  if (dragMode !== 'slide' && dragMode !== 'sequence') {
    throw new TypeError('dragMode must be slide or sequence.');
  }

  const labels = { ...defaultLabels, ...customLabels };
  if (cameraId !== undefined && frameIndex !== undefined) {
    throw new TypeError('Use either cameraId or frameIndex, not both.');
  }
  const cameraIndex =
    cameraId === undefined
      ? undefined
      : frames.findIndex((frame) => frame.cameraId === cameraId);
  // Frames resolve asynchronously (from POST /generate), so a controlled
  // cameraId can't be validated yet while frames.length is still 0 - once
  // frames arrive, normalizeFrame below clamps to a valid index either way.
  if (cameraIndex === -1 && frames.length > 0) {
    throw new RangeError('cameraId does not exist in the cameras.');
  }
  // `defaultCamera` is uncontrolled and only picks the initial frame, so it
  // must resolve exactly once against the (possibly still empty, since
  // frames resolve asynchronously) frame list - resolving it again on every
  // render would keep overriding the user's own subsequent navigation. When
  // neither `defaultCamera` nor `defaultFrameIndex` is given, it implicitly
  // falls back to `IMPLICIT_DEFAULT_CAMERA_ID` (or the very first camera if
  // that one isn't in `frames`) so the viewer always opens on a sensible
  // camera without requiring callers to specify one.
  if (
    defaultFrameIndex === undefined &&
    !defaultCameraApplied &&
    frames.length > 0
  ) {
    setDefaultCameraApplied(true);
    const effectiveDefaultCamera = resolveDefaultCameraId(
      frames.map((frame) => frame.cameraId),
      defaultCamera
    );
    const defaultIndex = frames.findIndex(
      (frame) => frame.cameraId === effectiveDefaultCamera
    );
    if (defaultIndex === -1) {
      if (defaultCamera !== undefined) {
        throw new RangeError('defaultCamera does not exist in the cameras.');
      }
      // Implicit fallback (IMPLICIT_DEFAULT_CAMERA_ID or the first camera)
      // is guaranteed to exist whenever frames isn't empty, so this only
      // happens when frames is empty - nothing to do, internalIndex already
      // starts at 0.
    } else if (defaultIndex !== internalIndex) {
      setInternalIndex(defaultIndex);
    }
  }
  const currentIndex = normalizeFrame(
    cameraIndex ?? frameIndex ?? internalIndex,
    frames.length,
    false
  );
  if (internalIndex !== currentIndex) {
    setInternalIndex(currentIndex);
  }

  function selectFrame(index: number) {
    const nextIndex = normalizeFrame(index, frames.length, loop);
    const frame = frames[nextIndex];
    if (!frame || nextIndex === currentIndex) return;
    if (frameIndex === undefined && cameraId === undefined) {
      setInternalIndex(nextIndex);
    }
    onFrameChange?.({ frameIndex: nextIndex, frame });
  }

  return (
    <div
      className={slotClasses('civ', rootClasses, classNames?.root, className)}
      style={style}
      role='group'
      aria-label={labels.viewer}
    >
      <ImageSequence
        frames={frames}
        frameIndex={currentIndex}
        loop={loop}
        dragMode={dragMode}
        pixelsPerFrame={pixelsPerFrame}
        preloadRadius={preloadRadius}
        showThumbnails={showThumbnails}
        {...(fullscreenShowThumbnails === undefined
          ? {}
          : { fullscreenShowThumbnails })}
        allowFullscreen={allowFullscreen}
        fullscreenIcon={fullscreenIcon}
        actions={actions}
        enableZoom={enableZoom}
        enableFullscreenZoom={enableFullscreenZoom}
        maxZoom={maxZoom}
        {...(fullscreenMaxZoom === undefined ? {} : { fullscreenMaxZoom })}
        classNames={classNames}
        labels={labels}
        onSelect={selectFrame}
        onImageError={onImageError}
        onZoomRequest={onZoomRequest}
        onFullscreenRequest={onFullscreenRequest}
        onFullscreenZoomRequest={onFullscreenZoomRequest}
      >
        {children}
      </ImageSequence>
    </div>
  );
}
