import { useEffect, useRef } from 'react';
import type {
  ViewerFrame,
  ViewerLabels,
  ViewerViewMode,
} from '../types/viewer.js';
import { frameIdentity } from '../utils/frames.js';
import { ThumbnailImage } from './ThumbnailImage.js';
import { arrowClasses, thumbnailButtonClasses } from '../constants/tailwind.js';

interface Props {
  frames: readonly ViewerFrame[];
  frameIndex: number;
  navigationIndex: number;
  viewMode: ViewerViewMode;
  alternateFrame: ViewerFrame | undefined;
  loop: boolean;
  showThumbnails: boolean;
  labels: ViewerLabels;
  enabled: boolean;
  loadedSources: ReadonlySet<string>;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSwitchView: () => void;
}

export function ViewerControls({
  frames,
  frameIndex,
  navigationIndex,
  viewMode,
  alternateFrame,
  loop,
  showThumbnails,
  labels,
  enabled,
  loadedSources,
  onSelect,
  onPrevious,
  onNext,
  onSwitchView,
}: Props) {
  const showCameraThumbnails = showThumbnails && frames.length > 1;
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    const selected = strip?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]'
    );
    if (!strip || !selected) return;
    if (selected.offsetLeft < strip.scrollLeft) {
      strip.scrollLeft = selected.offsetLeft;
    } else if (
      selected.offsetLeft + selected.offsetWidth >
      strip.scrollLeft + strip.clientWidth
    ) {
      strip.scrollLeft =
        selected.offsetLeft + selected.offsetWidth - strip.clientWidth;
    }
  }, [frameIndex, viewMode, showCameraThumbnails]);
  const alternateMode = viewMode === 'exterior' ? 'interior' : 'exterior';
  const alternateSrc = alternateFrame?.thumbnailSrc ?? alternateFrame?.src;
  const switchThumbnail =
    alternateFrame && frames.length > 0 ? (
      <button
        className={`civ__view-thumbnail ${thumbnailButtonClasses}`}
        type='button'
        aria-label={labels[alternateMode]}
        title={labels[alternateMode]}
        onClick={onSwitchView}
      >
        {showThumbnails && alternateSrc && (
          <ThumbnailImage
            src={alternateSrc}
            ready={enabled && loadedSources.has(alternateSrc)}
            index={0}
            placeholder=''
          />
        )}
        <span className='civ__view-label absolute inset-x-0 bottom-0 bg-black/65 px-[2px] py-[3px] text-center text-[10px] leading-[1.2] [overflow-wrap:anywhere] text-white'>
          {labels[alternateMode]}
        </span>
      </button>
    ) : null;

  return (
    <>
      <div className='civ__navigation pointer-events-none absolute inset-0 z-[3]'>
        {frames.length > 1 && (
          <button
            className={`civ__previous left-[4px] ${arrowClasses}`}
            type='button'
            aria-label={labels.previous}
            disabled={frames.length < 2 || (!loop && navigationIndex === 0)}
            onClick={onPrevious}
          >
            <svg
              className='drop-shadow-[0_1px_2px_rgb(0_0_0/65%)]'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              aria-hidden='true'
            >
              <path d='m15 5-7 7 7 7' stroke='currentColor' strokeWidth='1.5' />
            </svg>
          </button>
        )}
        <output
          className='civ__sr-only sr-only'
          aria-live='polite'
          aria-atomic='true'
        >
          {frames.length ? frameIndex + 1 : 0} / {frames.length}
        </output>
        {frames.length > 1 && (
          <button
            className={`civ__next right-[4px] ${arrowClasses}`}
            type='button'
            aria-label={labels.next}
            disabled={
              frames.length < 2 ||
              (!loop && navigationIndex === frames.length - 1)
            }
            onClick={onNext}
          >
            <svg
              className='drop-shadow-[0_1px_2px_rgb(0_0_0/65%)]'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              aria-hidden='true'
            >
              <path d='m9 5 7 7-7 7' stroke='currentColor' strokeWidth='1.5' />
            </svg>
          </button>
        )}
      </div>
      {(showCameraThumbnails || switchThumbnail) && (
        <div
          className='civ__thumbnails absolute bottom-[8px] left-1/2 z-[3] flex w-max max-w-[calc(100%_-_24px)] -translate-x-1/2 [touch-action:pan-x_pan-y] gap-[6px] overflow-x-auto p-[3px] [scrollbar-color:rgb(255_255_255/50%)_transparent] [scrollbar-width:thin]'
          ref={stripRef}
          role='group'
          aria-label={labels.frames}
        >
          {viewMode === 'interior' && switchThumbnail}
          {showCameraThumbnails &&
            frames.map((frame, index) => {
              const src = frame.thumbnailSrc ?? frame.src;
              return (
                <button
                  className={thumbnailButtonClasses}
                  key={frameIdentity(frame, index)}
                  type='button'
                  aria-label={frame.alt ?? `${labels[viewMode]} ${index + 1}`}
                  aria-pressed={frameIndex === index}
                  onClick={() => onSelect(index)}
                >
                  <ThumbnailImage
                    src={src}
                    ready={enabled && loadedSources.has(src)}
                    index={index}
                  />
                </button>
              );
            })}
          {viewMode === 'exterior' && switchThumbnail}
        </div>
      )}
    </>
  );
}
