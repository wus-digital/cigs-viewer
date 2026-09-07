import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CigsViewer,
  DEFAULT_EXTERIOR_CAMERAS,
  DEFAULT_INTERIOR_CAMERAS,
  type RenderConfiguration,
  type ViewerViewMode,
} from 'cigs-viewer';
import { ConfigurationEditor } from './components/ConfigurationEditor';
import { ViewerErrorBoundary } from './components/ViewerErrorBoundary';
import 'cigs-viewer/styles.css';
import './style.css';

const BASE_URL = 'https://cigs.elferplatz.com';
const INITIAL_CONFIGURATION = { B: '01', M: '01', P: '070707', PMV: '100' };

function Demo() {
  const [configuration, setConfiguration] = useState<RenderConfiguration>(
    INITIAL_CONFIGURATION
  );
  const [viewMode, setViewMode] = useState<ViewerViewMode>('exterior');
  const [cameraIds, setCameraIds] = useState({
    exterior: DEFAULT_EXTERIOR_CAMERAS[0]?.id,
    interior: DEFAULT_INTERIOR_CAMERAS[0]?.id,
  });
  const snippet = `import { CigsViewer } from 'cigs-viewer';\nimport 'cigs-viewer/styles.css';\n\n<CigsViewer\n  baseUrl=${JSON.stringify(BASE_URL)}\n  configuration={${JSON.stringify(configuration, null, 2)}}\n/>`;

  return (
    <main>
      <header>
        <span className='eyebrow'>LOKALES PACKAGE-BEISPIEL</span>
        <h1>CIGS Viewer</h1>
        <p>
          Durch die Kameras wischen, die Ansicht wechseln oder die Konfiguration
          anpassen.
        </p>
      </header>
      <div className='layout'>
        <section className='preview' aria-label='Viewer-Demo'>
          <ViewerErrorBoundary key={JSON.stringify(configuration)}>
            <CigsViewer
              baseUrl={BASE_URL}
              configuration={configuration}
              {...(cameraIds[viewMode] === undefined
                ? {}
                : { cameraId: cameraIds[viewMode] })}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onFrameChange={({ viewMode: mode, frame }) =>
                setCameraIds((current) => ({
                  ...current,
                  [mode]: frame.cameraId,
                }))
              }
              showThumbnails
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
              }}
            />
          </ViewerErrorBoundary>
          <p className='camera' aria-live='polite'>
            Aktuelle Kamera: <strong>{cameraIds[viewMode]}</strong>
          </p>
        </section>
        <aside>
          <h2>Konfiguration</h2>
          <ConfigurationEditor
            initialConfiguration={INITIAL_CONFIGURATION}
            onApply={setConfiguration}
          />
          <hr />
          <h2>Bildquelle</h2>
          <p className='source'>
            Feste Quelle: <code>{BASE_URL}</code>
          </p>
          <p>Alle Bilder werden direkt vom CIGS-Server geladen.</p>
        </aside>
      </div>
      <section className='usage'>
        <h2>So wird das Paket verwendet</h2>
        <pre>
          <code>{snippet}</code>
        </pre>
        <p>
          Exterieur: {DEFAULT_EXTERIOR_CAMERAS.map(({ id }) => id).join(', ')}.{' '}
          Interieur: {DEFAULT_INTERIOR_CAMERAS.map(({ id }) => id).join(', ')}.
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
