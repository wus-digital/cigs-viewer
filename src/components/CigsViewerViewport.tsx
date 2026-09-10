import { forwardRef, useCallback, useId } from 'react';
import type { HTMLAttributes, RefCallback } from 'react';
import { FrameImage } from './FrameImage.js';
import { ZoomFrameImage } from './ZoomFrameImage.js';
import { SlideTrack } from './SlideTrack.js';
import { frameIdentity } from '../utils/frames.js';
import { slotClasses } from '../utils/classes.js';
import { useViewerContext } from './ViewerContext.js';
import {
  controlsAgendaClasses,
  fill,
  statusClasses,
  viewportClasses,
} from '../constants/tailwind.js';

export type CigsViewerViewportProps = HTMLAttributes<HTMLDivElement>;

export const CigsViewerViewport = forwardRef<
  HTMLDivElement,
  CigsViewerViewportProps
>(function CigsViewerViewport(
  { children, className, onPointerDown, onKeyDown, ...props },
  forwardedRef
) {
  const {
    frames,
    alternateFrame,
    viewMode,
    frameIndex,
    loop,
    dragMode,
    enableZoom,
    fullscreen,
    labels,
    onImageError,
    frame,
    zoomScope,
    loading,
    handlers,
    selectFrame,
    classNames,
    registerViewport,
    registerCanvas,
    slide: { motion, onTransitionEnd },
    zoom: { scale, transform, reset: resetZoom },
  } = useViewerContext('CigsViewerViewport');
  const instructionsId = useId();
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      registerViewport(element);
      if (typeof forwardedRef === 'function') {
        const cleanup = (forwardedRef as RefCallback<HTMLDivElement>)(element);
        if (typeof cleanup === 'function')
          return () => {
            registerViewport(null);
            cleanup();
          };
      } else if (forwardedRef) forwardedRef.current = element;
    },
    [registerViewport, forwardedRef]
  );
  const image = frame ? (
    <FrameImage
      key={frameIdentity(frame, frameIndex)}
      change={{ viewMode, frameIndex, frame }}
      alt={
        frame.alt ?? `${labels[viewMode]} ${frameIndex + 1} / ${frames.length}`
      }
      labels={labels}
      onImageError={onImageError}
      enabled={loading.enabled}
      onSettled={loading.onSettled}
      onRetry={loading.onRetry}
      fallbackSrc={loading.retainedSources.get(
        frameIdentity(frame, frameIndex)
      )}
    />
  ) : (
    <div className={statusClasses} role='status'>
      {labels.empty}
    </div>
  );

  return (
    <div
      {...props}
      className={slotClasses(
        'civ__stage',
        `${viewportClasses} ${
          frames.length < 2 && scale === 1
            ? 'civ__stage--static cursor-default'
            : 'cursor-grab active:cursor-grabbing'
        }`,
        classNames?.viewport,
        className
      )}
      role='group'
      aria-label={labels[viewMode]}
      aria-describedby={instructionsId}
      tabIndex={0}
      ref={ref}
      {...handlers}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented) return;
        if (
          event.target instanceof window.Element &&
          event.target.closest('button, .civ__thumbnails')
        )
          return;
        handlers.onPointerDown(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (
          event.key === 'Escape' &&
          scale > 1 &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          resetZoom();
          return;
        }
        if (
          event.target !== event.currentTarget ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        const targets: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          Home: 0,
          End: frames.length - 1,
        };
        const target = targets[event.key];
        if (target !== undefined) {
          event.preventDefault();
          selectFrame(
            target,
            event.key === 'ArrowLeft' || event.key === 'ArrowRight'
          );
        }
      }}
    >
      <span id={instructionsId} className='civ__sr-only sr-only'>
        {frames.length > 1 && labels.instructions}
        {enableZoom && ` ${labels.zoomInstructions}`}
      </span>
      <output
        className='civ__sr-only sr-only'
        aria-live='polite'
        aria-atomic='true'
      >
        {frames.length ? frameIndex + 1 : 0} / {frames.length}
      </output>
      <div
        className={`civ__canvas ${fill} z-0 ${
          scale > 1
            ? 'civ__canvas--zoomed touch-none'
            : '[touch-action:pan-y_pinch-zoom]'
        }`}
        ref={registerCanvas}
      >
        <div className={`civ__zoom-layer ${fill}`} style={{ transform }}>
          <SlideTrack
            key={`${viewMode}:${dragMode}`}
            frames={frames}
            alternateFrame={alternateFrame}
            frameIndex={frameIndex}
            viewMode={viewMode}
            loop={loop}
            labels={labels}
            motion={motion}
            onTransitionEnd={onTransitionEnd}
            loadedSources={loading.loadedSources}
            failedSources={loading.failedSources}
            retainedSources={loading.retainedSources}
          >
            {image}
            {frame?.zoomSrc && frame.zoomSrc !== frame.src && (
              <ZoomFrameImage
                key={zoomScope}
                src={frame.zoomSrc}
                change={{ viewMode, frameIndex, frame }}
                active={
                  enableZoom &&
                  scale > 1 &&
                  !motion.active &&
                  loading.enabled &&
                  loading.loadedSources.has(frame.src)
                }
                labels={labels}
                onImageError={onImageError}
              />
            )}
          </SlideTrack>
        </div>
      </div>
      {fullscreen.active && (
        <p
          className={slotClasses(
            'civ__controls-agenda',
            controlsAgendaClasses,
            classNames?.controlsAgenda
          )}
        >
          {labels.zoomInstructions}
        </p>
      )}
      {children}
    </div>
  );
});
