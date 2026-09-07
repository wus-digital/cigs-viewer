import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { type RenderConfiguration, type ViewerCameraId } from 'cigs-viewer';
import { ConfigurationEditor } from './components/ConfigurationEditor';
import { CameraSelector } from './components/CameraSelector';
import { ViewerErrorBoundary } from './components/ViewerErrorBoundary';
import { DemoViewer } from './components/DemoViewer';
import { ViewerLayoutSelector } from './components/ViewerLayoutSelector';
import { viewerExample, type ViewerLayout } from './viewer-example.js';
import { focusStyles, headingStyles, paragraphStyles } from './utilities.js';
import './style.css';

const BASE_URL = 'https://cigs.elferplatz.com';
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

function Demo() {
  const [configuration, setConfiguration] = useState<RenderConfiguration>(
    INITIAL_CONFIGURATION
  );
  const [enableZoom, setEnableZoom] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [layout, setLayout] = useState<ViewerLayout>('default');
  const snippet = viewerExample({
    baseUrl: BASE_URL,
    configuration,
    cameras,
    enableZoom,
    showThumbnails,
    layout,
  });

  return (
    <main className='mx-auto max-w-[1440px] px-6 py-10 max-[900px]:px-3 max-[900px]:py-6'>
      <header>
        <span className='eyebrow text-xs font-bold tracking-[0.12em] text-[#176bba]'>
          LOKALES PACKAGE-BEISPIEL
        </span>
        <h1 className='my-2 text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em]'>
          CIGS Viewer
        </h1>
        <p className={paragraphStyles}>
          Durch die Kameras wischen, die Ansicht wechseln oder die Konfiguration
          anpassen.
        </p>
      </header>
      <div className='layout mt-7 grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6 max-[900px]:grid-cols-[minmax(0,1fr)]'>
        <section
          className='preview min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white'
          aria-label='Viewer-Demo'
        >
          <ViewerErrorBoundary
            resetKey={JSON.stringify([configuration, cameras, layout])}
          >
            <DemoViewer
              layout={layout}
              baseUrl={BASE_URL}
              className='[--civ-background:#eef3f7]'
              configuration={configuration}
              cameras={cameras}
              showThumbnails={showThumbnails}
              enableZoom={enableZoom}
              showDebug
              thumbnailQuality='FHD'
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
                debug: 'Viewer-Debug',
                debugCamera: 'Kamera',
                debugImage: 'Angezeigtes Bild',
                debugResolution: 'Originalaufloesung',
                debugZoom: 'Zoomstufe',
              }}
            />
          </ViewerErrorBoundary>
        </section>
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
          <label className='zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold'>
            <input
              type='checkbox'
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={showThumbnails}
              onChange={(event) => setShowThumbnails(event.target.checked)}
            />
            Thumbnails anzeigen
          </label>
          <CameraSelector cameras={cameras} onChange={setCameras} />
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
      <section className='usage mt-6 min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white p-6'>
        <h2 className={headingStyles}>So wird das Paket verwendet</h2>
        <pre className='m-0 overflow-x-auto rounded-lg bg-[#18212d] p-[18px] leading-[1.7] text-[#e7edf4]'>
          <code>{snippet}</code>
        </pre>
        <p className={paragraphStyles}>
          Nur eine Kamera: <code>{'cameras={["C1"]}'}</code>. Nur Interieur:{' '}
          <code>{'cameras={["C6"]}'}</code>.
        </p>
      </section>
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
