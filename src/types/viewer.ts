import type { CSSProperties, ReactNode } from 'react';
import type { DEFAULT_CAMERAS } from '../constants/default-cameras.js';

export type ViewerCameraId = (typeof DEFAULT_CAMERAS)[number]['id'];

export type RenderConfiguration = Readonly<
  Record<string, string | number | null | undefined>
>;

export const RENDER_QUALITIES = [
  'FHD',
  'WQHD',
  '4K',
  '4KHQ',
  '8K',
  '8KHQ',
] as const;

export type RenderQuality = (typeof RENDER_QUALITIES)[number];

export interface ViewerCamera {
  /** Exact filename camera token, e.g. C1. Array order defines swipe order. */
  id: string;
  label?: string;
}

export interface ViewerRenderOptions {
  configuration: RenderConfiguration;
  /** Absolute HTTP(S) URL or root-relative directory; no query string or hash. */
  baseUrl: string;
  /** Selected system camera IDs, in swipe order. Omitted selects all; [] selects none. */
  cameras?: readonly ViewerCameraId[];
  quality?: RenderQuality;
  /** Optional thumbnail quality, using the same configuration and camera. */
  thumbnailQuality?: RenderQuality;
  /**
   * Quality requested on demand once the user wheel-zooms in outside
   * fullscreen. Defaults to `4K` when `quality` is `FHD`/`WQHD`, otherwise
   * the same as `quality` (the base image is already high-res enough).
   */
  zoomQuality?: RenderQuality;
  /**
   * Quality requested on demand once fullscreen is entered, replacing the
   * base `quality` image for whichever camera is shown while fullscreen
   * stays active (including cameras swiped to afterwards). Defaults to
   * `4K`.
   */
  fullscreenQuality?: RenderQuality;
  /**
   * Quality requested on demand once the user wheel-zooms in while
   * fullscreen is active, replacing `zoomQuality` for the duration.
   * Defaults to `4K` when `fullscreenQuality` is `FHD`/`WQHD`, otherwise
   * the same as `fullscreenQuality` - so by default it reuses the
   * already-fetched fullscreen image instead of triggering another request.
   */
  fullscreenZoomQuality?: RenderQuality;
  /**
   * Called when a `POST /generate` call fails. The viewer keeps showing
   * previously resolved frames (if any) when this happens.
   */
  onGenerateError?: (error: Error) => void;
}

export interface ViewerFrame {
  src: string;
  cameraId: string;
  alt?: string;
  thumbnailSrc?: string;
  /** On-demand high-resolution source for this frame; never a thumbnail or neighbor preload. */
  zoomSrc?: string;
  /** On-demand `fullscreenQuality` source for this frame, resolved once fullscreen is entered. */
  fullscreenSrc?: string;
  /** On-demand `fullscreenZoomQuality` source for this frame, resolved once zooming while fullscreen. */
  fullscreenZoomSrc?: string;
  /**
   * True while a new generated image URL is being requested for this frame.
   * During this phase `src` may still point at the last successfully loaded image.
   */
  generating?: boolean;
}

export interface ViewerFrameChange {
  frameIndex: number;
  frame: ViewerFrame;
}

export interface ViewerLabels {
  viewer: string;
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
  fullscreen: string;
  exitFullscreen: string;
}

export interface ViewerClassNames {
  root?: string;
  viewport?: string;
  /** The default layout's navigation wrapper; custom layouts own their wrappers. */
  navigation?: string;
  previousButton?: string;
  nextButton?: string;
  zoomResetButton?: string;
  /**
   * The default layout's toolbar row housing the thumbnails, `actions` and
   * the fullscreen button together; custom layouts own their wrappers.
   */
  toolbar?: string;
  thumbnails?: string;
  thumbnail?: string;
  /** Applied to both the preview image and its placeholder wrapper for stable sizing. */
  thumbnailImage?: string;
  fullscreenButton?: string;
  /** Applied to every `actions` button, so they all share one consistent look. */
  actionButton?: string;
  controlsAgenda?: string;
}

export interface ViewerAction {
  /** Stable key; required when passing more than one action. */
  key?: string;
  /** Icon rendered inside the action button, e.g. an inline SVG. */
  icon: ReactNode;
  /** Accessible label, used for `aria-label` and as the visible tooltip. */
  label: string;
  /** Invoked when the action button is activated. */
  onClick: () => void;
  /** Disables the action button when true. */
  disabled?: boolean;
}

interface ViewerControlsProps {
  /** Zero-based index. Pair with onFrameChange when controlled. */
  frameIndex?: number;
  /** Controlled camera ID; use instead of frameIndex. */
  cameraId?: string;
  defaultFrameIndex?: number;
  /**
   * Camera ID pre-selected on mount, resolved against `frames` once it
   * loads. Uncontrolled - like `defaultFrameIndex`, it only sets the
   * initial frame and afterwards the viewer manages its own index; use
   * `cameraId` instead for controlled camera selection. Not combinable
   * with `defaultFrameIndex`. Defaults to `'C2'`, falling back to the
   * first entry in `cameras` when `'C2'` isn't present.
   */
  defaultCamera?: string;
  onFrameChange?: (change: ViewerFrameChange) => void;
  onImageError?: (error: Error, change: ViewerFrameChange) => void;
  loop?: boolean;
  /** Slide one image per gesture (default), or scrub continuously through the sequence. */
  dragMode?: 'slide' | 'sequence';
  /** Horizontal pointer travel per frame in sequence mode, in CSS pixels. */
  pixelsPerFrame?: number;
  /** Paired preload distance per direction: all frames by default, or 0-4. */
  preloadRadius?: number | 'all';
  /**
   * Shows thumbnails outside fullscreen. Defaults to `true`.
   * `fullscreenShowThumbnails` controls this independently while
   * fullscreen is active.
   */
  showThumbnails?: boolean;
  /**
   * Shows thumbnails while fullscreen is active, independent of
   * `showThumbnails`. Defaults to the same value as `showThumbnails` when
   * omitted, preserving the previous single-flag behavior.
   */
  fullscreenShowThumbnails?: boolean;
  /**
   * Enables the native fullscreen toggle. Defaults to `true`. When `false`,
   * the default layout hides the fullscreen button entirely and
   * `CigsViewerFullscreenButton` renders nothing in a custom layout either;
   * fullscreen can then never implicitly enable zoom (see `enableZoom`).
   */
  allowFullscreen?: boolean;
  /**
   * Custom icon for the fullscreen toggle button, so it visually matches
   * custom `actions` icons. Defaults to the built-in expand/exit icons.
   * Ignored when `allowFullscreen` is `false`.
   */
  fullscreenIcon?: ReactNode;
  /**
   * Extra custom buttons for the default layout - e.g. a download or share
   * button - each rendered as a `{ icon, label, onClick }` entry so every
   * action button automatically shares the exact same look as the
   * fullscreen button. Placed in the same row as the thumbnails and the
   * fullscreen button, after both. Ignored when `children` is provided;
   * compose a custom layout with `CigsViewerActionButton` instead.
   */
  actions?: readonly ViewerAction[];
  /** Enable wheel zoom and drag-to-pan outside fullscreen. Disabled by default. */
  enableZoom?: boolean;
  /**
   * Enable wheel zoom and drag-to-pan while fullscreen is active,
   * independent of `enableZoom`. Defaults to `true`, so fullscreen allows
   * zooming even when `enableZoom` is `false`; set to `false` to disable
   * zooming while fullscreen too.
   */
  enableFullscreenZoom?: boolean;
  /** Maximum wheel zoom scale outside fullscreen. Defaults to 4. */
  maxZoom?: number;
  /**
   * Maximum wheel zoom scale while fullscreen is active, independent of
   * `maxZoom`. Defaults to the same value as `maxZoom` when omitted,
   * preserving the previous single-limit behavior.
   */
  fullscreenMaxZoom?: number;
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
  frames: readonly ViewerFrame[];
  /**
   * Called when the viewer needs `zoomSrc` for the currently shown frame -
   * i.e. once the user actually starts wheel-zooming into it and it isn't
   * resolved yet. Internal to `CigsViewer`, which uses it to fetch the
   * zoom-quality image on demand instead of upfront for every camera.
   */
  onZoomRequest?: (change: ViewerFrameChange) => void;
  /**
   * Called when the viewer needs `fullscreenSrc` for the currently shown
   * frame - i.e. once fullscreen is entered (or the shown camera changes
   * while it stays active) and it isn't resolved yet. Internal to
   * `CigsViewer`, which uses it to fetch the fullscreen-quality image on
   * demand instead of upfront for every camera.
   */
  onFullscreenRequest?: (change: ViewerFrameChange) => void;
  /**
   * Called when the viewer needs `fullscreenZoomSrc` for the currently
   * shown frame - i.e. once the user wheel-zooms into it while fullscreen
   * is active and it isn't resolved yet. Internal to `CigsViewer`, which
   * uses it to fetch the fullscreen-zoom-quality image on demand instead
   * of upfront for every camera.
   */
  onFullscreenZoomRequest?: (change: ViewerFrameChange) => void;
}
