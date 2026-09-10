import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrameLoading } from './useFrameLoading.js';
import { useSequenceDrag } from './useSequenceDrag.js';
import { useSlideDrag } from './useSlideDrag.js';
import { useImageZoom } from './useImageZoom.js';
import { useFullscreen } from './useFullscreen.js';
import type {
  ViewerAction,
  ViewerClassNames,
  ViewerFrame,
  ViewerFrameChange,
  ViewerLabels,
} from '../types/viewer.js';

export interface ViewerControllerProps {
  frames: readonly ViewerFrame[];
  frameIndex: number;
  loop: boolean;
  dragMode: 'slide' | 'sequence';
  pixelsPerFrame: number;
  preloadRadius: number | 'all';
  showThumbnails: boolean;
  allowFullscreen: boolean;
  fullscreenIcon?: ReactNode | undefined;
  actions?: readonly ViewerAction[] | undefined;
  enableZoom: boolean;
  maxZoom: number;
  labels: ViewerLabels;
  classNames: ViewerClassNames | undefined;
  children?: ReactNode;
  onSelect: (index: number) => void;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
  onZoomRequest?: ((change: ViewerFrameChange) => void) | undefined;
}

export function useViewerController(props: ViewerControllerProps) {
  const {
    frames,
    frameIndex,
    loop,
    onSelect,
    dragMode,
    pixelsPerFrame,
    enableZoom,
    allowFullscreen,
    maxZoom,
    preloadRadius,
    showThumbnails,
  } = props;
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(
    null
  );
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(
    null
  );
  const fullscreen = useFullscreen(viewportElement);
  // Fullscreen only implicitly enables zoom while it's actually allowed -
  // otherwise a still-active native fullscreen session from before
  // `allowFullscreen` was toggled off would keep zoom force-enabled.
  const effectiveEnableZoom = enableZoom || (allowFullscreen && fullscreen.active);
  const {
    viewport: slideRef,
    motion,
    select,
    completeTransition,
    handlers: slideHandlers,
    onTransitionEnd,
  } = useSlideDrag(
    frameIndex,
    frames.length,
    loop,
    onSelect,
    JSON.stringify([dragMode, loop, frames.map(({ src }) => src)]),
    viewportElement
  );
  const drag = useSequenceDrag(
    pixelsPerFrame,
    onSelect,
    completeTransition,
    frames.length > 1,
    dragMode,
    viewportElement
  );
  const frame = frames[frameIndex];
  // Resets pan/scale only on real navigation (camera/frame change), never
  // when `zoomSrc` resolves for the frame already being viewed - otherwise
  // an in-progress zoom snaps back to 1x the moment the on-demand
  // zoom-quality image arrives, which also restarts its own image request.
  const panScope = JSON.stringify([dragMode, frameIndex, frame?.cameraId, frame?.src]);
  const zoomScope = JSON.stringify([
    dragMode,
    frameIndex,
    frame?.cameraId,
    frame?.src,
    frame?.zoomSrc,
  ]);
  const {
    viewport: zoomRef,
    scale,
    transform,
    reset,
    handlers: zoomHandlers,
  } = useImageZoom(
    effectiveEnableZoom && !!frame,
    maxZoom,
    panScope,
    motion.active,
    canvasElement
  );
  const loading = useFrameLoading(
    frames,
    frameIndex,
    preloadRadius,
    loop,
    showThumbnails,
    dragMode
  );
  const { onZoomRequest } = props;
  useEffect(() => {
    // Only request the zoom-quality image once the user has actually
    // zoomed in on it and its base image has finished loading - never
    // upfront, and never for a frame that's still showing a placeholder.
    if (
      !effectiveEnableZoom ||
      !frame ||
      scale <= 1 ||
      frame.zoomSrc ||
      !loading.loadedSources.has(frame.src)
    )
      return;
    onZoomRequest?.({ frameIndex, frame });
  }, [
    effectiveEnableZoom,
    scale,
    frame,
    frameIndex,
    loading.loadedSources,
    onZoomRequest,
  ]);
  const registerViewport = useCallback(
    (element: HTMLDivElement | null) => {
      if (element && slideRef.current && slideRef.current !== element) {
        throw new Error(
          'CigsViewer supports only one mounted CigsViewerViewport.'
        );
      }
      slideRef.current = element;
      setViewportElement(element);
    },
    [slideRef]
  );
  const registerCanvas = useCallback(
    (element: HTMLDivElement | null) => {
      zoomRef.current = element;
      setCanvasElement(element);
    },
    [zoomRef]
  );
  function selectFrame(index: number, relative = false) {
    reset();
    select(index, relative);
  }
  return {
    ...props,
    frame,
    enableZoom: effectiveEnableZoom,
    fullscreen,
    slide: { viewport: slideRef, motion, onTransitionEnd },
    zoom: { scale, transform, reset },
    zoomScope,
    loading,
    viewportElement,
    registerViewport,
    registerCanvas,
    handlers:
      scale > 1 ? zoomHandlers : dragMode === 'sequence' ? drag : slideHandlers,
    selectFrame,
  };
}
