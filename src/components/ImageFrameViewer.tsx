'use client';

import { useMemo, useState } from 'react';
import { ImageSequence } from './ImageSequence.js';
import { defaultLabels } from '../constants/default-labels.js';
import { rootClasses } from '../constants/tailwind.js';
import { slotClasses } from '../utils/classes.js';
import {
  normalizeFrame,
  validateFrames,
  validateInteger,
} from '../utils/frames.js';
import type { ImageFrameViewerProps } from '../types/viewer.js';

export function ImageFrameViewer({
  frames,
  frameIndex,
  cameraId,
  defaultFrameIndex = 0,
  onFrameChange,
  onImageError,
  loop = true,
  dragMode = 'slide',
  pixelsPerFrame = 24,
  preloadRadius = 'all',
  showThumbnails = false,
  enableZoom = false,
  maxZoom = 4,
  labels: customLabels,
  className,
  classNames,
  children,
  style,
}: ImageFrameViewerProps) {
  const [internalIndex, setInternalIndex] = useState(defaultFrameIndex);

  useMemo(() => validateFrames(frames, 'frames'), [frames]);
  validateInteger(defaultFrameIndex, 'defaultFrameIndex', 0);
  if (frameIndex !== undefined) validateInteger(frameIndex, 'frameIndex', 0);
  if (preloadRadius !== 'all')
    validateInteger(preloadRadius, 'preloadRadius', 0, 4);
  validateInteger(pixelsPerFrame, 'pixelsPerFrame', 1);
  if (typeof enableZoom !== 'boolean') {
    throw new TypeError('enableZoom must be a boolean.');
  }
  if (typeof maxZoom !== 'number' || !Number.isFinite(maxZoom) || maxZoom < 1) {
    throw new TypeError(
      'maxZoom must be a finite number greater than or equal to 1.'
    );
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
        enableZoom={enableZoom}
        maxZoom={maxZoom}
        classNames={classNames}
        labels={labels}
        onSelect={selectFrame}
        onImageError={onImageError}
      >
        {children}
      </ImageSequence>
    </div>
  );
}
