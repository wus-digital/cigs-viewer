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
  pixelsPerFrame = 24,
  preloadRadius = 1,
  showThumbnails = false,
  labels: customLabels,
  className,
  style,
}: ImageFrameViewerProps) {
  const [internalMode, setInternalMode] = useState(defaultViewMode);
  const [indices, setIndices] = useState({
    exterior: defaultFrameIndex,
    interior: defaultFrameIndex,
  });
  const activeMode = viewMode ?? internalMode;

  useMemo(() => {
    validateFrames(exteriorFrames, 'exteriorFrames');
    validateFrames(interiorFrames, 'interiorFrames');
  }, [exteriorFrames, interiorFrames]);
  validateInteger(defaultFrameIndex, 'defaultFrameIndex', 0);
  if (frameIndex !== undefined) validateInteger(frameIndex, 'frameIndex', 0);
  validateInteger(preloadRadius, 'preloadRadius', 0, 4);
  validateInteger(pixelsPerFrame, 'pixelsPerFrame', 1);
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
      className={['civ', className].filter(Boolean).join(' ')}
      style={style}
      role='group'
      aria-label={labels.viewer}
    >
      <div className='civ__views' role='group' aria-label={labels.viewer}>
        {(['exterior', 'interior'] as const).map((mode) => (
          <button
            key={mode}
            type='button'
            aria-pressed={activeMode === mode}
            onClick={() => selectMode(mode)}
          >
            {labels[mode]}
          </button>
        ))}
      </div>
      <ImageSequence
        key={activeMode}
        frames={frames}
        viewMode={activeMode}
        frameIndex={currentIndex}
        loop={loop}
        pixelsPerFrame={pixelsPerFrame}
        preloadRadius={preloadRadius}
        showThumbnails={showThumbnails}
        labels={labels}
        onSelect={selectFrame}
        onImageError={onImageError}
      />
    </div>
  );
}
