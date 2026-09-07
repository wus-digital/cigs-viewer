import { forwardRef, useCallback, useContext, useEffect, useRef } from 'react';
import type { HTMLAttributes, RefCallback } from 'react';
import { frameIdentity } from '../utils/frames.js';
import { slotClasses } from '../utils/classes.js';
import {
  thumbnailButtonClasses,
  thumbnailsClasses,
} from '../constants/tailwind.js';
import { ThumbnailImage } from './ThumbnailImage.js';
import { CigsViewerViewSwitchButton } from './CigsViewerButtons.js';
import { useViewerContext, ViewerLayoutContext } from './ViewerContext.js';

export type CigsViewerThumbnailsProps = HTMLAttributes<HTMLDivElement>;

export const CigsViewerThumbnails = forwardRef<
  HTMLDivElement,
  CigsViewerThumbnailsProps
>(function CigsViewerThumbnails(
  { className, children, ...props },
  forwardedRef
) {
  const layout = useContext(ViewerLayoutContext);
  const {
    frames,
    frameIndex,
    viewMode,
    alternateFrame,
    showThumbnails,
    labels,
    classNames,
    loading,
    selectFrame,
  } = useViewerContext('CigsViewerThumbnails');
  const showCameraThumbnails = showThumbnails && frames.length > 1;
  const stripRef = useRef<HTMLDivElement>(null);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      stripRef.current = element;
      if (typeof forwardedRef === 'function') {
        const cleanup = (forwardedRef as RefCallback<HTMLDivElement>)(element);
        if (typeof cleanup === 'function')
          return () => {
            stripRef.current = null;
            cleanup();
          };
      } else if (forwardedRef) forwardedRef.current = element;
    },
    [forwardedRef]
  );
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
  if (!showCameraThumbnails && !(alternateFrame && frames.length)) return null;
  return (
    <div
      {...props}
      ref={ref}
      className={slotClasses(
        'civ__thumbnails',
        `${thumbnailsClasses} ${layout.thumbnails ?? ''}`,
        classNames?.thumbnails,
        className
      )}
      role='group'
      aria-label={labels.frames}
    >
      {viewMode === 'interior' && <CigsViewerViewSwitchButton />}
      {showCameraThumbnails &&
        frames.map((frame, index) => {
          const src = frame.thumbnailSrc ?? frame.src;
          return (
            <button
              className={slotClasses(
                'civ__thumbnail',
                thumbnailButtonClasses,
                classNames?.thumbnail
              )}
              key={frameIdentity(frame, index)}
              type='button'
              aria-label={frame.alt ?? `${labels[viewMode]} ${index + 1}`}
              aria-pressed={frameIndex === index}
              onClick={() => selectFrame(index)}
            >
              <ThumbnailImage
                src={src}
                ready={loading.enabled && loading.loadedSources.has(src)}
                index={index}
                className={classNames?.thumbnailImage}
              />
            </button>
          );
        })}
      {viewMode === 'exterior' && <CigsViewerViewSwitchButton />}
      {children}
    </div>
  );
});
