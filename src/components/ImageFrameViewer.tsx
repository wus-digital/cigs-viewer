'use client';

import { useMemo, useState } from 'react';
import { ImageSequence } from './ImageSequence.js';
import { defaultLabels } from '../constants/default-labels.js';
import {
  normalizeFrame,
  validateFrames,
  validateInteger,
} from '../utils/frames.js';
import type { ImageFrameViewerProps, ViewerViewMode } from '../types/viewer.js';

export function ImageFrameViewer({
  exteriorFrames,
  interiorFrames,
  viewMode,
  defaultViewMode = 'exterior',
  onViewModeChange,
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
  showDebug = false,
  labels: customLabels,
  className,
  style,
}: ImageFrameViewerProps) {
  const [internalMode, setInternalMode] = useState(defaultViewMode);
  const [indices, setIndices] = useState({
    exterior: defaultFrameIndex,
    interior: defaultFrameIndex,
  });
  const requestedMode = viewMode ?? internalMode;
  const activeMode =
    viewMode === undefined
      ? requestedMode === 'exterior' &&
        !exteriorFrames.length &&
        interiorFrames.length
        ? 'interior'
        : requestedMode === 'interior' &&
            !interiorFrames.length &&
            exteriorFrames.length
          ? 'exterior'
          : requestedMode
      : requestedMode;
  if (viewMode === undefined && activeMode !== internalMode)
    setInternalMode(activeMode);

  useMemo(() => {
    validateFrames(exteriorFrames, 'exteriorFrames');
    validateFrames(interiorFrames, 'interiorFrames');
  }, [exteriorFrames, interiorFrames]);
  validateInteger(defaultFrameIndex, 'defaultFrameIndex', 0);
  if (frameIndex !== undefined) validateInteger(frameIndex, 'frameIndex', 0);
  if (preloadRadius !== 'all')
    validateInteger(preloadRadius, 'preloadRadius', 0, 4);
  validateInteger(pixelsPerFrame, 'pixelsPerFrame', 1);
  if (typeof enableZoom !== 'boolean') {
    throw new TypeError('enableZoom must be a boolean.');
  }
  if (typeof showDebug !== 'boolean') {
    throw new TypeError('showDebug must be a boolean.');
  }
  if (dragMode !== 'slide' && dragMode !== 'sequence') {
    throw new TypeError('dragMode must be slide or sequence.');
  }
  if (activeMode !== 'exterior' && activeMode !== 'interior') {
    throw new TypeError('viewMode must be exterior or interior.');
  }

  const labels = { ...defaultLabels, ...customLabels };
  const frames = activeMode === 'exterior' ? exteriorFrames : interiorFrames;
  if (cameraId !== undefined && frameIndex !== undefined) {
    throw new TypeError('Use either cameraId or frameIndex, not both.');
  }
  const cameraIndex =
    cameraId === undefined
      ? undefined
      : frames.findIndex((frame) => frame.cameraId === cameraId);
  if (cameraIndex === -1) {
    throw new RangeError(
      `cameraId does not exist in the ${activeMode} cameras.`
    );
  }
  const currentIndex = normalizeFrame(
    cameraIndex ?? frameIndex ?? indices[activeMode],
    frames.length,
    false
  );
  if (indices[activeMode] !== currentIndex) {
    setIndices((current) => ({ ...current, [activeMode]: currentIndex }));
  }
  const alternateMode = activeMode === 'exterior' ? 'interior' : 'exterior';
  const alternateFrames =
    alternateMode === 'exterior' ? exteriorFrames : interiorFrames;
  const alternateIndex = normalizeFrame(
    frameIndex ?? indices[alternateMode],
    alternateFrames.length,
    false
  );

  function selectFrame(index: number) {
    const nextIndex = normalizeFrame(index, frames.length, loop);
    const frame = frames[nextIndex];
    if (!frame || nextIndex === currentIndex) return;
    if (frameIndex === undefined && cameraId === undefined) {
      setIndices((current) => ({ ...current, [activeMode]: nextIndex }));
    }
    onFrameChange?.({ viewMode: activeMode, frameIndex: nextIndex, frame });
  }

  function selectMode(mode: ViewerViewMode) {
    if (mode === activeMode) return;
    if (viewMode === undefined) setInternalMode(mode);
    onViewModeChange?.(mode);
  }

  return (
    <div
      className={[
        'civ box-border w-full min-w-0 bg-[var(--civ-background)] [font-family:inherit] text-[var(--civ-foreground)] [--civ-accent:#176bba] [--civ-aspect-ratio:16/9] [--civ-background:#f4f4f4] [--civ-foreground:#181818] [&_*]:box-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role='group'
      aria-label={labels.viewer}
    >
      <ImageSequence
        key={`${activeMode}:${dragMode}`}
        frames={frames}
        alternateFrame={
          frames.length ? alternateFrames[alternateIndex] : undefined
        }
        onSwitchView={() =>
          selectMode(activeMode === 'exterior' ? 'interior' : 'exterior')
        }
        viewMode={activeMode}
        frameIndex={currentIndex}
        loop={loop}
        dragMode={dragMode}
        pixelsPerFrame={pixelsPerFrame}
        preloadRadius={preloadRadius}
        showThumbnails={showThumbnails}
        enableZoom={enableZoom}
        showDebug={showDebug}
        labels={labels}
        onSelect={selectFrame}
        onImageError={onImageError}
      />
    </div>
  );
}
