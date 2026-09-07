import { forwardRef } from 'react';
import {
  arrowClasses,
  thumbnailButtonClasses,
  zoomResetClasses,
} from '../constants/tailwind.js';
import { useViewerContext } from './ViewerContext.js';
import { ViewerButton } from './ViewerButton.js';
import type { CigsViewerButtonProps } from './ViewerButton.js';
import { ThumbnailImage } from './ThumbnailImage.js';

function Arrow({ previous }: { previous: boolean }) {
  return (
    <svg
      className='drop-shadow-[0_1px_2px_rgb(0_0_0/65%)]'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      aria-hidden='true'
    >
      <path
        d={previous ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'}
        stroke='currentColor'
        strokeWidth='1.5'
      />
    </svg>
  );
}

export const CigsViewerPreviousButton = forwardRef<
  HTMLButtonElement,
  CigsViewerButtonProps
>(function CigsViewerPreviousButton({ children, ...props }, ref) {
  const { frames, frameIndex, slide, loop, labels, classNames, selectFrame } =
    useViewerContext('CigsViewerPreviousButton');
  if (frames.length < 2) return null;
  return (
    <ViewerButton
      {...props}
      ref={ref}
      marker='civ__previous'
      slot='previousButton'
      defaults={arrowClasses}
      slotOverride={classNames?.previousButton}
      label={labels.previous}
      unavailable={!loop && (slide.motion.targetIndex ?? frameIndex) === 0}
      action={() => selectFrame(-1, true)}
    >
      {props.asChild ? children : (children ?? <Arrow previous />)}
    </ViewerButton>
  );
});

export const CigsViewerNextButton = forwardRef<
  HTMLButtonElement,
  CigsViewerButtonProps
>(function CigsViewerNextButton({ children, ...props }, ref) {
  const { frames, frameIndex, slide, loop, labels, classNames, selectFrame } =
    useViewerContext('CigsViewerNextButton');
  if (frames.length < 2) return null;
  return (
    <ViewerButton
      {...props}
      ref={ref}
      marker='civ__next'
      slot='nextButton'
      defaults={arrowClasses}
      slotOverride={classNames?.nextButton}
      label={labels.next}
      unavailable={
        !loop && (slide.motion.targetIndex ?? frameIndex) === frames.length - 1
      }
      action={() => selectFrame(1, true)}
    >
      {props.asChild ? children : (children ?? <Arrow previous={false} />)}
    </ViewerButton>
  );
});

export const CigsViewerZoomResetButton = forwardRef<
  HTMLButtonElement,
  CigsViewerButtonProps
>(function CigsViewerZoomResetButton({ children, ...props }, ref) {
  const { zoom, labels, classNames } = useViewerContext(
    'CigsViewerZoomResetButton'
  );
  if (zoom.scale <= 1) return null;
  return (
    <ViewerButton
      {...props}
      ref={ref}
      marker='civ__reset-zoom'
      slot='zoomResetButton'
      defaults={zoomResetClasses}
      slotOverride={classNames?.zoomResetButton}
      label={labels.resetZoom}
      unavailable={false}
      action={zoom.reset}
    >
      {props.asChild ? children : (children ?? labels.resetZoom)}
    </ViewerButton>
  );
});

export const CigsViewerViewSwitchButton = forwardRef<
  HTMLButtonElement,
  CigsViewerButtonProps
>(function CigsViewerViewSwitchButton({ children, ...props }, ref) {
  const {
    frames,
    alternateFrame,
    viewMode,
    showThumbnails,
    labels,
    classNames,
    loading,
    switchView,
  } = useViewerContext('CigsViewerViewSwitchButton');
  if (!alternateFrame || !frames.length) return null;
  const alternateMode = viewMode === 'exterior' ? 'interior' : 'exterior';
  const src = alternateFrame.thumbnailSrc ?? alternateFrame.src;
  return (
    <ViewerButton
      title={labels[alternateMode]}
      {...props}
      ref={ref}
      marker='civ__view-thumbnail'
      slot='viewSwitchButton'
      defaults={thumbnailButtonClasses}
      slotOverride={classNames?.viewSwitchButton}
      label={labels[alternateMode]}
      unavailable={false}
      action={switchView}
    >
      {props.asChild
        ? children
        : (children ?? (
            <>
              {showThumbnails && (
                <ThumbnailImage
                  src={src}
                  ready={loading.enabled && loading.loadedSources.has(src)}
                  index={0}
                  placeholder=''
                  className={classNames?.thumbnailImage}
                />
              )}
              <span className='civ__view-label absolute inset-x-0 bottom-0 bg-black/65 px-[2px] py-[3px] text-center text-[10px] leading-[1.2] [overflow-wrap:anywhere] text-white'>
                {labels[alternateMode]}
              </span>
            </>
          ))}
    </ViewerButton>
  );
});
