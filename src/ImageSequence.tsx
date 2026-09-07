import { useEffect, useId } from 'react';
import { FrameImage } from './FrameImage.js';
import { adjacentSources } from './frames.js';
import { useSequenceDrag } from './useSequenceDrag.js';
import type {
  ViewerFrame,
  ViewerFrameChange,
  ViewerLabels,
  ViewerViewMode,
} from './types.js';

interface Props {
  frames: readonly ViewerFrame[];
  viewMode: ViewerViewMode;
  frameIndex: number;
  loop: boolean;
  pixelsPerFrame: number;
  preloadRadius: number;
  showThumbnails: boolean;
  labels: ViewerLabels;
  onSelect: (index: number) => void;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
}

export function ImageSequence({
  frames,
  viewMode,
  frameIndex,
  loop,
  pixelsPerFrame,
  preloadRadius,
  showThumbnails,
  labels,
  onSelect,
  onImageError,
}: Props) {
  const instructionsId = useId();
  const drag = useSequenceDrag(frameIndex, pixelsPerFrame, onSelect);
  const frame = frames[frameIndex];
  const preloadSources = JSON.stringify(
    adjacentSources(frames, frameIndex, preloadRadius, loop)
  );

  useEffect(() => {
    const sources: string[] = JSON.parse(preloadSources);
    const images = sources.map((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = src;
      return image;
    });
    return () => {
      for (const image of images) image.removeAttribute('src');
    };
  }, [preloadSources]);

  return (
    <>
      <div
        className='civ__stage'
        role='group'
        aria-label={labels[viewMode]}
        aria-describedby={instructionsId}
        tabIndex={0}
        {...drag}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          )
            return;
          const targets: Record<string, number> = {
            ArrowLeft: frameIndex - 1,
            ArrowRight: frameIndex + 1,
            Home: 0,
            End: frames.length - 1,
          };
          const target = targets[event.key];
          if (target !== undefined) {
            event.preventDefault();
            onSelect(target);
          }
        }}
      >
        <span id={instructionsId} className='civ__sr-only'>
          {labels.instructions}
        </span>
        {frame ? (
          <FrameImage
            key={frame.src}
            change={{ viewMode, frameIndex, frame }}
            alt={
              frame.alt ??
              `${labels[viewMode]} ${frameIndex + 1} / ${frames.length}`
            }
            labels={labels}
            onImageError={onImageError}
          />
        ) : (
          <div className='civ__status' role='status'>
            {labels.empty}
          </div>
        )}
      </div>
      <div className='civ__navigation'>
        <button
          type='button'
          disabled={frames.length < 2 || (!loop && frameIndex === 0)}
          onClick={() => onSelect(frameIndex - 1)}
        >
          {labels.previous}
        </button>
        <output aria-live='polite' aria-atomic='true'>
          {frames.length ? frameIndex + 1 : 0} / {frames.length}
        </output>
        <button
          type='button'
          disabled={
            frames.length < 2 || (!loop && frameIndex === frames.length - 1)
          }
          onClick={() => onSelect(frameIndex + 1)}
        >
          {labels.next}
        </button>
      </div>
      {showThumbnails && frames.length > 0 && (
        <div
          className='civ__thumbnails'
          role='group'
          aria-label={labels.frames}
        >
          {frames.map((item, index) => (
            <button
              key={index}
              type='button'
              aria-label={item.alt ?? `${labels[viewMode]} ${index + 1}`}
              aria-pressed={frameIndex === index}
              onClick={() => onSelect(index)}
            >
              {item.thumbnailSrc ? (
                <img
                  src={item.thumbnailSrc}
                  alt=''
                  width={80}
                  height={45}
                  loading='lazy'
                  decoding='async'
                  draggable={false}
                />
              ) : (
                index + 1
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
