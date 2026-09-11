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
  fullscreenShowThumbnails?: boolean | undefined;
  allowFullscreen: boolean;
  fullscreenIcon?: ReactNode | undefined;
  actions?: readonly ViewerAction[] | undefined;
  enableZoom: boolean;
  enableFullscreenZoom: boolean;
  maxZoom: number;
  fullscreenMaxZoom?: number | undefined;
  labels: ViewerLabels;
  classNames: ViewerClassNames | undefined;
  children?: ReactNode;
  onSelect: (index: number) => void;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
  onZoomRequest?: ((change: ViewerFrameChange) => void) | undefined;
  onFullscreenRequest?: ((change: ViewerFrameChange) => void) | undefined;
  onFullscreenZoomRequest?: ((change: ViewerFrameChange) => void) | undefined;
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
    enableFullscreenZoom,
    allowFullscreen,
    maxZoom,
    fullscreenMaxZoom,
    preloadRadius,
    showThumbnails,
    fullscreenShowThumbnails,
  } = props;
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(
    null
  );
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(
    null
  );
  const fullscreen = useFullscreen(viewportElement);
  // While fullscreen is active, zoom is governed solely by
  // `enableFullscreenZoom` (independent of `enableZoom`) - and only while
  // fullscreen is actually allowed, so a still-active native fullscreen
  // session from before `allowFullscreen` was toggled off can't keep zoom
  // force-enabled.
  const effectiveEnableZoom = fullscreen.active
    ? allowFullscreen && enableFullscreenZoom
    : enableZoom;
  // `fullscreenMaxZoom`/`fullscreenShowThumbnails` default to inheriting
  // their non-fullscreen counterpart when left unset, so the previous
  // single-flag behavior is preserved unless explicitly overridden.
  const effectiveMaxZoom = fullscreen.active
    ? (fullscreenMaxZoom ?? maxZoom)
    : maxZoom;
  const effectiveShowThumbnails = fullscreen.active
    ? (fullscreenShowThumbnails ?? showThumbnails)
    : showThumbnails;
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
  // Prefixed with a discriminator so scopes stay unique even when two
  // quality tiers resolve to the same underlying URL (e.g. zoomQuality and
  // fullscreenQuality both set to "4K") - otherwise React sees duplicate
  // keys across the sibling <ZoomFrameImage> elements.
  const zoomScope = JSON.stringify([
    'zoom',
    dragMode,
    frameIndex,
    frame?.cameraId,
    frame?.src,
    frame?.zoomSrc,
  ]);
  const fullscreenScope = JSON.stringify([
    'fullscreen',
    dragMode,
    frameIndex,
    frame?.cameraId,
    frame?.src,
    frame?.fullscreenSrc,
  ]);
  const fullscreenZoomScope = JSON.stringify([
    'fullscreenZoom',
    dragMode,
    frameIndex,
    frame?.cameraId,
    frame?.src,
    frame?.fullscreenZoomSrc,
  ]);
  const {
    viewport: zoomRef,
    scale,
    transform,
    reset,
    handlers: zoomHandlers,
  } = useImageZoom(
    effectiveEnableZoom && !!frame,
    effectiveMaxZoom,
    panScope,
    motion.active,
    canvasElement
  );
  const loading = useFrameLoading(
    frames,
    frameIndex,
    preloadRadius,
    loop,
    effectiveShowThumbnails,
    dragMode
  );
  const { onZoomRequest } = props;
  useEffect(() => {
    // Only request the zoom-quality image once the user has actually
    // zoomed in on it (outside fullscreen - `onFullscreenZoomRequest`
    // below handles zooming while fullscreen instead) and its base image
    // has finished loading - never upfront, and never for a frame that's
    // still showing a placeholder.
    if (
      !effectiveEnableZoom ||
      !frame ||
      scale <= 1 ||
      fullscreen.active ||
      frame.zoomSrc ||
      !loading.loadedSources.has(frame.src)
    )
      return;
    onZoomRequest?.({ frameIndex, frame });
  }, [
    effectiveEnableZoom,
    scale,
    fullscreen.active,
    frame,
    frameIndex,
    loading.loadedSources,
    onZoomRequest,
  ]);
  const { onFullscreenRequest } = props;
  useEffect(() => {
    // Fetch `fullscreenQuality` for whichever camera is shown once
    // fullscreen is entered (and again for each camera swiped to
    // afterwards, while it stays active) - only once its base image has
    // finished loading, never upfront and never for a placeholder frame.
    if (
      !fullscreen.active ||
      !frame ||
      frame.fullscreenSrc ||
      !loading.loadedSources.has(frame.src)
    )
      return;
    onFullscreenRequest?.({ frameIndex, frame });
  }, [
    fullscreen.active,
    frame,
    frameIndex,
    loading.loadedSources,
    onFullscreenRequest,
  ]);
  const { onFullscreenZoomRequest } = props;
  useEffect(() => {
    // Only request the fullscreen-zoom-quality image once the user has
    // actually zoomed in while fullscreen is active, and its base image
    // has finished loading - never upfront, and never for a placeholder.
    if (
      !effectiveEnableZoom ||
      !fullscreen.active ||
      !frame ||
      scale <= 1 ||
      frame.fullscreenZoomSrc ||
      !loading.loadedSources.has(frame.src)
    )
      return;
    onFullscreenZoomRequest?.({ frameIndex, frame });
  }, [
    effectiveEnableZoom,
    fullscreen.active,
    scale,
    frame,
    frameIndex,
    loading.loadedSources,
    onFullscreenZoomRequest,
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
    maxZoom: effectiveMaxZoom,
    showThumbnails: effectiveShowThumbnails,
    fullscreen,
    slide: { viewport: slideRef, motion, onTransitionEnd },
    zoom: { scale, transform, reset },
    zoomScope,
    fullscreenScope,
    fullscreenZoomScope,
    loading,
    viewportElement,
    registerViewport,
    registerCanvas,
    handlers:
      scale > 1 ? zoomHandlers : dragMode === 'sequence' ? drag : slideHandlers,
    selectFrame,
  };
}
