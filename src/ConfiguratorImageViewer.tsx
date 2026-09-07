'use client';

import { useMemo, useState } from 'react';
import { ImageSequence } from './ImageSequence.js';
import {
  defaultLabels,
  normalizeFrame,
  validateFrames,
  validateInteger,
} from './frames.js';
import type { ConfiguratorImageViewerProps, ViewerViewMode } from './types.js';

export function ConfiguratorImageViewer({
  exteriorFrames,
  interiorFrames,
  viewMode,
  defaultViewMode = 'exterior',
  onViewModeChange,
  frameIndex,
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
}: ConfiguratorImageViewerProps) {
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
  const currentIndex = normalizeFrame(
    frameIndex ?? indices[activeMode],
    frames.length,
    false
  );

  function selectFrame(index: number) {
    const nextIndex = normalizeFrame(index, frames.length, loop);
    const frame = frames[nextIndex];
    if (!frame || nextIndex === currentIndex) return;
    if (frameIndex === undefined) {
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
