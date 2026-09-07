import type { CSSProperties } from 'react';

export type ViewerViewMode = 'exterior' | 'interior';

export interface ViewerFrame {
  src: string;
  alt?: string;
  thumbnailSrc?: string;
}

export interface ViewerFrameChange {
  viewMode: ViewerViewMode;
  frameIndex: number;
  frame: ViewerFrame;
}

export interface ViewerLabels {
  viewer: string;
  exterior: string;
  interior: string;
  previous: string;
  next: string;
  loading: string;
  empty: string;
  error: string;
  retry: string;
  frames: string;
  instructions: string;
}

export interface ConfiguratorImageViewerProps {
  exteriorFrames: readonly ViewerFrame[];
  interiorFrames: readonly ViewerFrame[];
  viewMode?: ViewerViewMode;
  defaultViewMode?: ViewerViewMode;
  onViewModeChange?: (viewMode: ViewerViewMode) => void;
  /** Zero-based index in the active view. Pair with onFrameChange when controlled. */
  frameIndex?: number;
  defaultFrameIndex?: number;
  onFrameChange?: (change: ViewerFrameChange) => void;
  onImageError?: (error: Error, change: ViewerFrameChange) => void;
  loop?: boolean;
  /** Horizontal pointer travel per frame, in CSS pixels. */
  pixelsPerFrame?: number;
  /** Number of adjacent images to preload per direction (0-4). */
  preloadRadius?: number;
  showThumbnails?: boolean;
  labels?: Partial<ViewerLabels>;
  className?: string;
  style?: CSSProperties;
}
