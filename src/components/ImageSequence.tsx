import { useId } from 'react';
import { FrameImage } from './FrameImage.js';
import { ZoomFrameImage } from './ZoomFrameImage.js';
import { SlideTrack } from './SlideTrack.js';
import { useFrameLoading } from '../hooks/useFrameLoading.js';
import { useSequenceDrag } from '../hooks/useSequenceDrag.js';
import { useSlideDrag } from '../hooks/useSlideDrag.js';
import { useImageZoom } from '../hooks/useImageZoom.js';
import { frameIdentity } from '../utils/frames.js';
import { ViewerControls } from './ViewerControls.js';
import { ViewerDebug } from './ViewerDebug.js';
import {
  buttonInteraction,
  fill,
  statusClasses,
} from '../constants/tailwind.js';
import type {
  ViewerFrame,
  ViewerFrameChange,
  ViewerLabels,
  ViewerViewMode,
} from '../types/viewer.js';

interface Props {
  frames: readonly ViewerFrame[];
  alternateFrame: ViewerFrame | undefined;
  onSwitchView: () => void;
  viewMode: ViewerViewMode;
  frameIndex: number;
  loop: boolean;
  dragMode: 'slide' | 'sequence';
  pixelsPerFrame: number;
  preloadRadius: number | 'all';
  showThumbnails: boolean;
  enableZoom: boolean;
  showDebug: boolean;
  labels: ViewerLabels;
  onSelect: (index: number) => void;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
}

export function ImageSequence({
  frames,
  alternateFrame,
  onSwitchView,
  viewMode,
  frameIndex,
  loop,
  dragMode,
  pixelsPerFrame,
  preloadRadius,
  showThumbnails,
  enableZoom,
  showDebug,
  labels,
  onSelect,
  onImageError,
}: Props) {
  const instructionsId = useId();
  const {
    viewport: slideRef,
    handlers: slideHandlers,
    motion,
    onTransitionEnd,
    select,
    switchView,
    completeTransition,
  } = useSlideDrag(
    frameIndex,
    frames.length,
    loop,
    onSelect,
    JSON.stringify([dragMode, loop, frames.map(({ src }) => src)])
  );
  const drag = useSequenceDrag(
    pixelsPerFrame,
    onSelect,
    completeTransition,
    frames.length > 1
  );
  const frame = frames[frameIndex];
  const zoomScope = JSON.stringify([
    viewMode,
    frameIndex,
    frame?.cameraId,
    frame?.src,
    frame?.zoomSrc,
  ]);
  const {
    viewport: zoomRef,
    scale,
    transform,
    reset: resetZoom,
    handlers: zoomHandlers,
  } = useImageZoom(enableZoom && !!frame, zoomScope, motion.active);
  const handlers =
    scale > 1 ? zoomHandlers : dragMode === 'sequence' ? drag : slideHandlers;
  function selectFrame(index: number, relative = false) {
    resetZoom();
    select(index, relative);
  }
  const loading = useFrameLoading(
    frames,
    frameIndex,
    preloadRadius,
    loop,
    showThumbnails,
    alternateFrame?.thumbnailSrc ?? alternateFrame?.src
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
    <>
      <div
        className={`civ__stage relative aspect-[var(--civ-aspect-ratio)] w-full overflow-hidden select-none focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--civ-accent)] focus-visible:outline-solid ${
          frames.length < 2 && scale === 1
            ? 'civ__stage--static cursor-default'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        role='group'
        aria-label={labels[viewMode]}
        aria-describedby={instructionsId}
        tabIndex={0}
        ref={slideRef}
        {...handlers}
        onPointerDown={(event) => {
          if (
            event.target instanceof window.Element &&
            event.target.closest('button, .civ__thumbnails')
          )
            return;
          handlers.onPointerDown(event);
        }}
        onKeyDown={(event) => {
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
        <div
          className={`civ__canvas ${fill} z-0 ${
            scale > 1
              ? 'civ__canvas--zoomed touch-none'
              : '[touch-action:pan-y_pinch-zoom]'
          }`}
          ref={zoomRef}
        >
          <div className={`civ__zoom-layer ${fill}`} style={{ transform }}>
            <SlideTrack
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
        <ViewerControls
          frames={frames}
          frameIndex={frameIndex}
          navigationIndex={motion.targetIndex ?? frameIndex}
          viewMode={viewMode}
          alternateFrame={alternateFrame}
          loop={loop}
          showThumbnails={showThumbnails}
          labels={labels}
          enabled={loading.enabled}
          loadedSources={loading.loadedSources}
          onSelect={selectFrame}
          onPrevious={() => selectFrame(-1, true)}
          onNext={() => selectFrame(1, true)}
          onSwitchView={() => {
            resetZoom();
            switchView(viewMode === 'exterior' ? 1 : -1, onSwitchView);
          }}
        />
        {scale > 1 && (
          <button
            className={`civ__reset-zoom ${buttonInteraction} absolute top-[8px] right-[8px] z-[3] min-h-[44px] rounded-[4px] border border-white/50 bg-black/55 px-[12px] py-[8px] text-[12px] text-white hover:bg-black/45`}
            type='button'
            onClick={resetZoom}
          >
            {labels.resetZoom}
          </button>
        )}
      </div>
      {showDebug && (
        <ViewerDebug
          viewport={slideRef}
          cameraId={frame?.cameraId}
          scale={scale}
          labels={labels}
        />
      )}
    </>
  );
}
