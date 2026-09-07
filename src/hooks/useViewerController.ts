import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrameLoading } from './useFrameLoading.js';
import { useSequenceDrag } from './useSequenceDrag.js';
import { useSlideDrag } from './useSlideDrag.js';
import { useImageZoom } from './useImageZoom.js';
import type {
  ViewerClassNames,
  ViewerFrame,
  ViewerFrameChange,
  ViewerLabels,
  ViewerViewMode,
} from '../types/viewer.js';

export interface ViewerControllerProps {
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
  classNames: ViewerClassNames | undefined;
  children?: ReactNode;
  onSelect: (index: number) => void;
  onImageError: ((error: Error, change: ViewerFrameChange) => void) | undefined;
}

export function useViewerController(props: ViewerControllerProps) {
  const {
    frames,
    frameIndex,
    loop,
    onSelect,
    dragMode,
    viewMode,
    pixelsPerFrame,
    enableZoom,
    preloadRadius,
    showThumbnails,
    alternateFrame,
  } = props;
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(
    null
  );
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(
    null
  );
  const {
    viewport: slideRef,
    motion,
    select,
    switchView,
    completeTransition,
    handlers: slideHandlers,
    onTransitionEnd,
  } = useSlideDrag(
    frameIndex,
    frames.length,
    loop,
    onSelect,
    JSON.stringify([viewMode, dragMode, loop, frames.map(({ src }) => src)]),
    viewportElement
  );
  const drag = useSequenceDrag(
    pixelsPerFrame,
    onSelect,
    completeTransition,
    frames.length > 1,
    JSON.stringify([viewMode, dragMode]),
    viewportElement
  );
  const frame = frames[frameIndex];
  const zoomScope = JSON.stringify([
    viewMode,
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
    enableZoom && !!frame,
    zoomScope,
    motion.active,
    canvasElement
  );
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
  const loading = useFrameLoading(
    frames,
    frameIndex,
    preloadRadius,
    loop,
    showThumbnails,
    alternateFrame?.thumbnailSrc ?? alternateFrame?.src,
    JSON.stringify([viewMode, dragMode])
  );
  function selectFrame(index: number, relative = false) {
    reset();
    select(index, relative);
  }
  return {
    ...props,
    frame,
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
    switchView() {
      reset();
      switchView(viewMode === 'exterior' ? 1 : -1, props.onSwitchView);
    },
  };
}
