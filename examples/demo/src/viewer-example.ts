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

interface ExampleOptions {
  baseUrl: string;
  configuration: RenderConfiguration;
  cameras: readonly ViewerCameraId[];
  enableZoom: boolean;
  maxZoom: number;
  quality: RenderQuality;
  showThumbnails: boolean;
  layout: ViewerLayout;
}

export function viewerExample({
  baseUrl,
  configuration,
  cameras,
  enableZoom,
  maxZoom,
  quality,
  showThumbnails,
  layout,
}: ExampleOptions) {
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
      : "import { CigsViewer } from 'cigs-viewer';";
  const formatted = (value: unknown) =>
    JSON.stringify(value, null, 2).replaceAll('\n', '\n  ');
  const props = `  baseUrl=${JSON.stringify(baseUrl)}
  configuration={${formatted(configuration)}}
  cameras={${JSON.stringify(cameras)}}
  quality=${JSON.stringify(quality)}
  showThumbnails={${showThumbnails}}${enableZoom ? '\n  enableZoom' : ''}
  maxZoom={${maxZoom}}
  ${layout === 'styled' ? `classNames={${formatted(styledClassNames)}}` : ''}`.trimEnd();
  if (layout !== 'custom') return `${imports}\n\n<CigsViewer\n${props}\n/>`;
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
