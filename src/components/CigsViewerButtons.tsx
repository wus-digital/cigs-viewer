import { forwardRef } from 'react';
import {
  actionButtonClasses,
  arrowClasses,
  fullscreenButtonClasses,
  zoomResetClasses,
} from '../constants/tailwind.js';
import { useViewerContext } from './ViewerContext.js';
import { ViewerButton } from './ViewerButton.js';
import type { CigsViewerButtonProps } from './ViewerButton.js';
import type { ViewerAction } from '../types/viewer.js';

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

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      {active ? (
        <>
          <path d='M9 4H5a1 1 0 0 0-1 1v4' />
          <path d='M15 4h4a1 1 0 0 1 1 1v4' />
          <path d='M9 20H5a1 1 0 0 1-1-1v-4' />
          <path d='M15 20h4a1 1 0 0 0 1-1v-4' />
        </>
      ) : (
        <>
          <path d='M4 9V5a1 1 0 0 1 1-1h4' />
          <path d='M20 9V5a1 1 0 0 0-1-1h-4' />
          <path d='M4 15v4a1 1 0 0 0 1 1h4' />
          <path d='M20 15v4a1 1 0 0 1-1 1h-4' />
        </>
      )}
    </svg>
  );
}

export const CigsViewerFullscreenButton = forwardRef<
  HTMLButtonElement,
  CigsViewerButtonProps
>(function CigsViewerFullscreenButton({ children, ...props }, ref) {
  const { fullscreen, labels, classNames, allowFullscreen, fullscreenIcon } =
    useViewerContext('CigsViewerFullscreenButton');
  if (!fullscreen.supported || !allowFullscreen) return null;
  const label = fullscreen.active ? labels.exitFullscreen : labels.fullscreen;
  return (
    <ViewerButton
      {...props}
      ref={ref}
      marker='civ__fullscreen'
      slot='fullscreenButton'
      defaults={fullscreenButtonClasses}
      slotOverride={classNames?.fullscreenButton}
      label={label}
      unavailable={false}
      action={fullscreen.toggle}
    >
      {props.asChild
        ? children
        : (children ??
          fullscreenIcon ?? <FullscreenIcon active={fullscreen.active} />)}
    </ViewerButton>
  );
});

export interface CigsViewerActionButtonProps
  extends Omit<CigsViewerButtonProps, 'children'> {
  /** The action to render as a button; icon, label and click handler. */
  action: ViewerAction;
}

export const CigsViewerActionButton = forwardRef<
  HTMLButtonElement,
  CigsViewerActionButtonProps
>(function CigsViewerActionButton({ action, ...props }, ref) {
  const { classNames } = useViewerContext('CigsViewerActionButton');
  return (
    <ViewerButton
      {...props}
      ref={ref}
      marker='civ__action'
      slot='actionButton'
      defaults={actionButtonClasses}
      slotOverride={classNames?.actionButton}
      label={action.label}
      unavailable={action.disabled ?? false}
      action={action.onClick}
    >
      {action.icon}
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
