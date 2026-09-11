import type {
  RenderConfiguration,
  RenderQuality,
  ViewerCameraId,
  ViewerClassNames,
} from 'cigs-viewer';

export const viewerLayouts = [
  { value: 'default', label: 'Standard' },
  { value: 'styled', label: 'Styling-Overrides' },
  { value: 'custom', label: 'Eigenes Layout / asChild' },
] as const;

export type ViewerLayout = (typeof viewerLayouts)[number]['value'];

export const styledClassNames: ViewerClassNames = {
  viewport: 'rounded-2xl',
  previousButton:
    'size-12 rounded-full bg-slate-900 text-white shadow-lg enabled:hover:bg-slate-700',
  nextButton:
    'size-12 rounded-full bg-slate-900 text-white shadow-lg enabled:hover:bg-slate-700',
  thumbnails: 'gap-3',
  thumbnail: 'rounded-xl aria-pressed:border-sky-500 aria-pressed:shadow-none',
  thumbnailImage: 'h-12 w-20 rounded-lg',
  zoomResetButton: 'rounded-full bg-slate-900',
};

export const customPreviousClasses =
  'absolute left-3 top-1/2 z-[3] size-11 -translate-y-1/2 rounded-full bg-slate-900 text-white shadow-lg enabled:hover:bg-slate-700';
export const customNextClasses =
  'absolute right-3 top-1/2 z-[3] size-11 -translate-y-1/2 rounded-full bg-slate-900 text-white shadow-lg enabled:hover:bg-slate-700';
export const customZoomClasses = 'absolute right-3 top-3 z-[3] rounded-full';
export const customThumbnailsClasses =
  'mx-auto my-3 max-w-[calc(100%_-_24px)] justify-start gap-3 rounded-xl bg-slate-900 p-2';

export const demoActionsSnippet = `const actions: ViewerAction[] = [
  {
    key: 'download',
    label: 'Bild herunterladen',
    icon: <DownloadIcon />,
    onClick: () => downloadCurrentImage(),
  },
  {
    key: 'share',
    label: 'Konfiguration teilen',
    icon: <ShareIcon />,
    onClick: () => shareConfiguration(),
  },
];`;

interface ExampleOptions {
  baseUrl: string;
  configuration: RenderConfiguration;
  cameras: readonly ViewerCameraId[];
  defaultCamera: ViewerCameraId | undefined;
  enableZoom: boolean;
  enableFullscreenZoom: boolean;
  maxZoom: number;
  fullscreenMaxZoom: number;
  quality: RenderQuality;
  zoomQuality: RenderQuality;
  fullscreenQuality: RenderQuality;
  fullscreenZoomQuality: RenderQuality;
  showThumbnails: boolean;
  fullscreenShowThumbnails: boolean;
  allowFullscreen: boolean;
  actionsExample: boolean;
  layout: ViewerLayout;
}

export function viewerExample({
  baseUrl,
  configuration,
  cameras,
  defaultCamera,
  enableZoom,
  enableFullscreenZoom,
  maxZoom,
  fullscreenMaxZoom,
  quality,
  zoomQuality,
  fullscreenQuality,
  fullscreenZoomQuality,
  showThumbnails,
  fullscreenShowThumbnails,
  allowFullscreen,
  actionsExample,
  layout,
}: ExampleOptions) {
  const showActions = actionsExample && layout !== 'custom';
  const imports =
    layout === 'custom'
      ? `import {
  CigsViewer,
  CigsViewerViewport,
  CigsViewerPreviousButton,
  CigsViewerNextButton,
  CigsViewerZoomResetButton,
  CigsViewerThumbnails,
} from 'cigs-viewer';`
      : `import { CigsViewer${showActions ? ', type ViewerAction' : ''} } from 'cigs-viewer';`;
  const formatted = (value: unknown) =>
    JSON.stringify(value, null, 2).replaceAll('\n', '\n  ');
  const defaultCameraLine = `  defaultCamera=${JSON.stringify(defaultCamera ?? 'C2')}`;
  const props = `  baseUrl=${JSON.stringify(baseUrl)}
  configuration={${formatted(configuration)}}
  cameras={${JSON.stringify(cameras)}} // Standard: alle System-Kameras
${defaultCameraLine} // Standard: "C2" (sonst die erste Kamera aus cameras)
  quality=${JSON.stringify(quality)} // Standard: "FHD"
  zoomQuality=${JSON.stringify(zoomQuality)} // Standard: "4K" (bleibt bei quality in 4K/8K)
  fullscreenQuality=${JSON.stringify(fullscreenQuality)} // Standard: "4K"
  fullscreenZoomQuality=${JSON.stringify(fullscreenZoomQuality)} // Standard: "4K" (bleibt bei fullscreenQuality in 4K/8K)
  showThumbnails={${showThumbnails}} // Standard: true
  fullscreenShowThumbnails={${fullscreenShowThumbnails}} // Standard: wie showThumbnails
  enableZoom={${enableZoom}} // Standard: false
  enableFullscreenZoom={${enableFullscreenZoom}} // Standard: true
  maxZoom={${maxZoom}} // Standard: 4
  fullscreenMaxZoom={${fullscreenMaxZoom}} // Standard: wie maxZoom
  allowFullscreen={${allowFullscreen}} // Standard: true${showActions ? '\n  actions={actions}' : ''}
  ${layout === 'styled' ? `classNames={${formatted(styledClassNames)}}` : ''}`.trimEnd();
  const actionsBlock = showActions ? `\n${demoActionsSnippet}\n` : '';
  if (layout !== 'custom')
    return `${imports}\n${actionsBlock}\n<CigsViewer\n${props}\n/>`;
  return `${imports}

<CigsViewer
${props}
>
  <CigsViewerViewport>
    <CigsViewerPreviousButton asChild>
      <button className="${customPreviousClasses}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </CigsViewerPreviousButton>
    <CigsViewerNextButton asChild>
      <button className="${customNextClasses}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </CigsViewerNextButton>
    <CigsViewerZoomResetButton className="${customZoomClasses}" />
  </CigsViewerViewport>
  <CigsViewerThumbnails className="${customThumbnailsClasses}" />
</CigsViewer>`;
}
