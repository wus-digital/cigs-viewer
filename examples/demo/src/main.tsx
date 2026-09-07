import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CigsViewer,
  DEFAULT_EXTERIOR_CAMERAS,
  DEFAULT_INTERIOR_CAMERAS,
  type ViewerViewMode,
} from 'cigs-viewer';
import 'cigs-viewer/styles.css';
import './style.css';

function Demo() {
  const [paint, setPaint] = useState('070707');
  const [pmv, setPmv] = useState('100');
  const [baseUrl, setBaseUrl] = useState('/demo-renders');
  const [viewMode, setViewMode] = useState<ViewerViewMode>('exterior');
  const [cameraIds, setCameraIds] = useState({
    exterior: DEFAULT_EXTERIOR_CAMERAS[0]?.id,
    interior: DEFAULT_INTERIOR_CAMERAS[0]?.id,
  });
  const [urlError, setUrlError] = useState('');
  const configuration = useMemo(
    () => ({ B: '01', M: '01', P: paint, PMV: pmv }),
    [paint, pmv]
  );
  const snippet = `import { CigsViewer } from 'cigs-viewer';\nimport 'cigs-viewer/styles.css';\n\n<CigsViewer\n  baseUrl=${JSON.stringify(baseUrl)}\n  configuration={${JSON.stringify(configuration)}}\n/>`;

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
          <CigsViewer
            baseUrl={baseUrl}
            configuration={configuration}
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
          <p className='camera' aria-live='polite'>
            Aktuelle Kamera: <strong>{cameraIds[viewMode]}</strong>
          </p>
        </section>
        <aside>
          <h2>Konfiguration</h2>
          <p>
            Modell <code>B01</code> / Variante <code>M01</code>
          </p>
          <label htmlFor='paint'>Lackfarbe P</label>
          <div className='paint'>
            <input
              id='paint'
              type='color'
              value={`#${paint}`}
              onChange={(event) =>
                setPaint(event.target.value.slice(1).toUpperCase())
              }
            />
            <code>{paint}</code>
          </div>
          <label htmlFor='pmv'>PMV: {pmv}</label>
          <input
            id='pmv'
            type='range'
            min='0'
            max='100'
            step='1'
            value={pmv}
            onChange={(event) => setPmv(event.target.value)}
          />
          <hr />
          <h2>Bildquelle</h2>
          <p>
            {baseUrl === '/demo-renders'
              ? 'Lokale SVG-Beispielbilder. Es werden keine externen Render-Anfragen gesendet.'
              : 'Die Bilder werden vom eingetragenen Render-Service geladen. Konfigurationsaenderungen senden neue Bildanfragen.'}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const value = String(
                new FormData(event.currentTarget).get('baseUrl') ?? ''
              ).trim();
              const url = new URL(value);
              if (
                !['http:', 'https:'].includes(url.protocol) ||
                url.username ||
                url.password ||
                url.search ||
                url.hash ||
                value.includes('\\')
              ) {
                setUrlError(
                  'Bitte eine HTTP(S)-Basis-URL ohne Zugangsdaten, Query oder Hash eingeben.'
                );
                return;
              }
              setUrlError('');
              setBaseUrl(value);
            }}
          >
            <label htmlFor='base-url'>Eigener Render-Service</label>
            <input
              id='base-url'
              name='baseUrl'
              type='url'
              required
              placeholder='https://dein-render-server.de'
              aria-describedby={urlError ? 'url-error' : undefined}
            />
            <button type='submit'>Render-Service verwenden</button>
            {urlError && (
              <p id='url-error' role='alert'>
                {urlError}
              </p>
            )}
          </form>
          <button
            type='button'
            onClick={() => {
              setBaseUrl('/demo-renders');
              setUrlError('');
            }}
          >
            Lokale Demo verwenden
          </button>
          <p className='source'>
            Aktive Quelle: <code>{baseUrl}</code>
          </p>
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
