import type { CSSProperties } from 'react';

export type ViewerViewMode = 'exterior' | 'interior';

export type RenderConfiguration = Readonly<
  Record<string, string | number | null | undefined>
>;

export type RenderQuality = 'FHD' | 'WQHD' | '4K' | '4KHQ' | '8K' | '8KHQ';

export interface ViewerCamera {
  /** Exact filename camera token, e.g. C360_001. Array order defines swipe order. */
  id: string;
  label?: string;
}

export interface ViewerRenderOptions {
  configuration: RenderConfiguration;
  /** Absolute HTTP(S) URL or root-relative directory; no query string or hash. */
  baseUrl: string;
  exteriorCameras: readonly ViewerCamera[];
  interiorCameras: readonly ViewerCamera[];
  quality?: RenderQuality;
  /** Optional thumbnail quality, using the same configuration and camera. */
  thumbnailQuality?: RenderQuality;
  /** Defaults match the existing CIGS render filters. [] disables a view's filter. */
  omittedConfigurationKeys?: Partial<Record<ViewerViewMode, readonly string[]>>;
}

export interface ViewerFrame {
  src: string;
  cameraId: string;
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

interface ViewerControlsProps {
  viewMode?: ViewerViewMode;
  defaultViewMode?: ViewerViewMode;
  onViewModeChange?: (viewMode: ViewerViewMode) => void;
  /** Zero-based index in the active view. Pair with onFrameChange when controlled. */
  frameIndex?: number;
  /** Controlled camera ID in the active view; use instead of frameIndex. */
  cameraId?: string;
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

export interface ConfiguratorImageViewerProps
  extends ViewerRenderOptions, ViewerControlsProps {}

export interface ImageFrameViewerProps extends ViewerControlsProps {
  exteriorFrames: readonly ViewerFrame[];
  interiorFrames: readonly ViewerFrame[];
}
