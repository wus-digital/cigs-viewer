import type { CSSProperties, ReactNode } from 'react';
import type {
  EXTERIOR_CAMERAS,
  INTERIOR_CAMERAS,
} from '../constants/default-cameras.js';

export type ViewerViewMode = 'exterior' | 'interior';
export type ViewerCameraId =
  | (typeof EXTERIOR_CAMERAS)[number]['id']
  | (typeof INTERIOR_CAMERAS)[number]['id'];

export type RenderConfiguration = Readonly<
  Record<string, string | number | null | undefined>
>;

export type RenderQuality = 'FHD' | 'WQHD' | '4K' | '4KHQ' | '8K' | '8KHQ';

export interface ViewerCamera {
  /** Exact filename camera token, e.g. C1. Array order defines swipe order. */
  id: string;
  label?: string;
}

export interface ViewerRenderOptions {
  configuration: RenderConfiguration;
  /** Absolute HTTP(S) URL or root-relative directory; no query string or hash. */
  baseUrl: string;
  /** Selected system camera IDs, in swipe order per view. Omitted selects all; [] selects none. */
  cameras?: readonly ViewerCameraId[];
  /** @deprecated Use cameras to select IDs from the system catalog. Cannot be combined with cameras. */
  exteriorCameras?: readonly ViewerCamera[];
  /** @deprecated Use cameras to select IDs from the system catalog. Cannot be combined with cameras. */
  interiorCameras?: readonly ViewerCamera[];
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
  /** On-demand high-resolution source for this frame; never a thumbnail or neighbor preload. */
  zoomSrc?: string;
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
  resetZoom: string;
  zoomInstructions: string;
  debug?: string;
  debugCamera?: string;
  debugImage?: string;
  debugResolution?: string;
  debugZoom?: string;
}

export interface ViewerClassNames {
  root?: string;
  viewport?: string;
  /** The default layout's navigation wrapper; custom layouts own their wrappers. */
  navigation?: string;
  previousButton?: string;
  nextButton?: string;
  zoomResetButton?: string;
  thumbnails?: string;
  thumbnail?: string;
  /** Applied to both the preview image and its placeholder wrapper for stable sizing. */
  thumbnailImage?: string;
  viewSwitchButton?: string;
  debug?: string;
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
  /** Slide one image per gesture (default), or scrub continuously through the sequence. */
  dragMode?: 'slide' | 'sequence';
  /** Horizontal pointer travel per frame in sequence mode, in CSS pixels. */
  pixelsPerFrame?: number;
  /** Paired preload distance per direction: all frames by default, or 0-4. */
  preloadRadius?: number | 'all';
  showThumbnails?: boolean;
  /** Enable wheel zoom (1x-4x) and drag-to-pan. Disabled by default. */
  enableZoom?: boolean;
  /** Show actual displayed image metadata below the image. Disabled by default. */
  showDebug?: boolean;
  labels?: Partial<ViewerLabels>;
  /** Slot utilities override the default theme using tailwind-merge. */
  classNames?: ViewerClassNames;
  /** Omit for the default UI. Provided children own the layout and controls. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface CigsViewerProps
  extends ViewerRenderOptions, ViewerControlsProps {}

export interface ImageFrameViewerProps extends ViewerControlsProps {
  exteriorFrames: readonly ViewerFrame[];
  interiorFrames: readonly ViewerFrame[];
}
