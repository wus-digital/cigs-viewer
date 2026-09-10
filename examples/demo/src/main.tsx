import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  EXTERIOR_CAMERAS,
  INTERIOR_CAMERAS,
  type RenderConfiguration,
  type RenderQuality,
  type ViewerCameraId,
  type ViewerViewMode,
} from 'cigs-viewer';
import { ConfigurationEditor } from './components/ConfigurationEditor';
import { CameraSelector } from './components/CameraSelector';
import { ViewerErrorBoundary } from './components/ViewerErrorBoundary';
import { DemoViewer } from './components/DemoViewer';
import { ViewerLayoutSelector } from './components/ViewerLayoutSelector';
import { QualitySelector } from './components/QualitySelector';
import { ViewerDebugPanel } from './components/ViewerDebugPanel';
import { viewerExample, type ViewerLayout } from './viewer-example.js';
import { focusStyles, headingStyles, paragraphStyles } from './utilities.js';
import './style.css';

const BASE_URL = 'https://cdn.cigs.elferplatz.com';
const INITIAL_CONFIGURATION = { B: '01', M: '01', P: '070707', PMV: '100' };
const INITIAL_CAMERAS: readonly ViewerCameraId[] = [
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'C7',
  'C12',
  'C13',
];
const MAX_ZOOM_OPTIONS = [2, 3, 4, 6, 8] as const;
const CAMERA_IDS_BY_VIEW = {
  exterior: EXTERIOR_CAMERAS.map(({ id }) => id),
  interior: INTERIOR_CAMERAS.map(({ id }) => id),
} as const;

function firstSelectedCamera(
  cameras: readonly ViewerCameraId[],
  viewMode: ViewerViewMode
) {
  return CAMERA_IDS_BY_VIEW[viewMode].find((id) => cameras.includes(id));
}

function Demo() {
  const viewerRoot = useRef<HTMLElement>(null);
  const [configuration, setConfiguration] = useState<RenderConfiguration>(
    INITIAL_CONFIGURATION
  );
  const [enableZoom, setEnableZoom] = useState(false);
  const [maxZoom, setMaxZoom] = useState(4);
  const [quality, setQuality] = useState<RenderQuality>('FHD');
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [layout, setLayout] = useState<ViewerLayout>('default');
  const [debugViewMode, setDebugViewMode] =
    useState<ViewerViewMode>('exterior');
  const [debugCameraId, setDebugCameraId] = useState<string | undefined>(
    () => firstSelectedCamera(INITIAL_CAMERAS, 'exterior')
  );
  const snippet = viewerExample({
    baseUrl: BASE_URL,
    configuration,
    cameras,
    enableZoom,
    maxZoom,
    quality,
    showThumbnails,
    layout,
  });

  function handleCamerasChange(nextCameras: readonly ViewerCameraId[]) {
    setCameras(nextCameras);
    setDebugCameraId((current) =>
      current !== undefined && nextCameras.some((id) => id === current)
        ? current
        : firstSelectedCamera(nextCameras, debugViewMode)
    );
  }

  return (
    <main className='mx-auto max-w-[1440px] px-6 py-10 max-[900px]:px-3 max-[900px]:py-6'>
      <header>
        <h1 className='my-2 text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em]'>
          CIGS Viewer
        </h1>
        <p className={paragraphStyles}>
          Durch die Kameras wischen, die Ansicht wechseln oder die Konfiguration
          anpassen.
        </p>
      </header>
      <div className='layout mt-7 grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6 max-[900px]:grid-cols-[minmax(0,1fr)]'>
        <div className='grid min-w-0 gap-6'>
          <section
            ref={viewerRoot}
            className='preview min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white'
            aria-label='Viewer-Demo'
          >
            <ViewerErrorBoundary
              resetKey={JSON.stringify([
                configuration,
                cameras,
                layout,
                quality,
              ])}
            >
              <DemoViewer
                layout={layout}
                baseUrl={BASE_URL}
                className='[--civ-background:#eef3f7]'
                configuration={configuration}
                cameras={cameras}
                quality={quality}
                showThumbnails={showThumbnails}
                enableZoom={enableZoom}
                maxZoom={maxZoom}
                thumbnailQuality='FHD'
                onViewModeChange={(viewMode) => {
                  setDebugViewMode(viewMode);
                  setDebugCameraId(firstSelectedCamera(cameras, viewMode));
                }}
                onFrameChange={(change) => {
                  setDebugViewMode(change.viewMode);
                  setDebugCameraId(change.frame.cameraId);
                }}
                labels={{
                  viewer: 'Fahrzeugansicht',
                  exterior: 'Exterieur',
                  interior: 'Interieur',
                  previous: 'Zurueck',
                  next: 'Weiter',
                  frames: 'Kamera auswaehlen',
                  loading: 'Bild wird geladen...',
                  error:
                    'Bild konnte nicht geladen werden. Render-URL und Konfiguration pruefen.',
                  retry: 'Erneut versuchen',
                  empty: 'Keine Kameras vorhanden.',
                  instructions:
                    'Horizontal wischen oder Pfeiltasten nutzen. Home und End waehlen die erste und letzte Kamera.',
                  resetZoom: 'Zoom zuruecksetzen',
                  zoomInstructions:
                    'Mit dem Mausrad zoomen, vergroessertes Bild durch Ziehen verschieben. Escape setzt den Zoom zurueck.',
                }}
              />
            </ViewerErrorBoundary>
          </section>
          <section className='debug-panel min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white p-6'>
            <ViewerDebugPanel
              viewerRoot={viewerRoot}
              cameraId={debugCameraId}
            />
          </section>
          <section className='usage min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white p-6'>
            <pre className='m-0 overflow-x-auto rounded-lg bg-[#18212d] p-[18px] leading-[1.7] text-[#e7edf4]'>
              <code>{snippet}</code>
            </pre>
          </section>
        </div>
        <aside className='min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white p-6'>
          <ViewerLayoutSelector value={layout} onChange={setLayout} />
          <label className='zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold'>
            <input
              type='checkbox'
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={enableZoom}
              onChange={(event) => setEnableZoom(event.target.checked)}
            />
            Mausrad-Zoom aktivieren
          </label>
          <label className='mb-6 block text-sm font-semibold'>
            Maximaler Zoom
            <select
              className={`mt-2 block w-full rounded-md border border-[#9caabd] bg-white p-2.5 ${focusStyles}`}
              value={maxZoom}
              onChange={(event) => setMaxZoom(Number(event.target.value))}
            >
              {MAX_ZOOM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}x
                </option>
              ))}
            </select>
          </label>
          <QualitySelector value={quality} onChange={setQuality} />
          <label className='zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold'>
            <input
              type='checkbox'
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={showThumbnails}
              onChange={(event) => setShowThumbnails(event.target.checked)}
            />
            Thumbnails anzeigen
          </label>
          <CameraSelector cameras={cameras} onChange={handleCamerasChange} />
          <h2 className={headingStyles}>Konfiguration</h2>
          <ConfigurationEditor
            initialConfiguration={INITIAL_CONFIGURATION}
            onApply={setConfiguration}
          />
          <hr className='my-6 border-0 border-t border-[#dce3eb]' />
          <h2 className={headingStyles}>Bildquelle</h2>
          <p
            className={`source text-xs [overflow-wrap:anywhere] ${paragraphStyles}`}
          >
            Feste Quelle: <code>{BASE_URL}</code>
          </p>
          <p className={paragraphStyles}>
            Alle Bilder werden direkt vom CIGS-Server geladen.
          </p>
        </aside>
      </div>
    </main>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Demo root element is missing.');
createRoot(container).render(
  <StrictMode>
    <Demo />
  </StrictMode>
);
