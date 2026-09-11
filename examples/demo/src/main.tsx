import { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type RenderConfiguration,
  type RenderQuality,
  type ViewerAction,
  type ViewerCameraId,
} from "cigs-viewer";
import { ConfigurationEditor } from "./components/ConfigurationEditor";
import { CameraSelector } from "./components/CameraSelector";
import { DefaultCameraSelector } from "./components/DefaultCameraSelector";
import { ViewerErrorBoundary } from "./components/ViewerErrorBoundary";
import { DemoViewer } from "./components/DemoViewer";
import { ViewerLayoutSelector } from "./components/ViewerLayoutSelector";
import { QualitySelector } from "./components/QualitySelector";
import { ViewerDebugPanel } from "./components/ViewerDebugPanel";
import { DownloadIcon, ShareIcon } from "./components/ActionIcons";
import { viewerExample, type ViewerLayout } from "./viewer-example.js";
import { focusStyles, headingStyles, paragraphStyles } from "./utilities.js";
import "./style.css";

// POST /generate must hit the CIGS render service API directly (not the
// image CDN) - it's the only source of image URLs, so this is the sole
// endpoint CigsViewer talks to.
const BASE_URL = import.meta.env.DEV
  ? "http://localhost:3234"
  : "https://cigs.elferplatz.com";
const INITIAL_CONFIGURATION = { B: "01", M: "01", P: "070707", PMV: "100" };
const INITIAL_CAMERAS: readonly ViewerCameraId[] = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C12",
  "C13",
];
const MAX_ZOOM_OPTIONS = [2, 3, 4, 6, 8] as const;

function Demo() {
  const viewerRoot = useRef<HTMLElement>(null);
  const [configuration, setConfiguration] = useState<RenderConfiguration>(
    INITIAL_CONFIGURATION,
  );
  const [enableZoom, setEnableZoom] = useState(false);
  const [enableFullscreenZoom, setEnableFullscreenZoom] = useState(true);
  const [maxZoom, setMaxZoom] = useState(4);
  const [fullscreenMaxZoom, setFullscreenMaxZoom] = useState(4);
  const [quality, setQuality] = useState<RenderQuality>("FHD");
  const [zoomQuality, setZoomQuality] = useState<RenderQuality>("4K");
  const [fullscreenQuality, setFullscreenQuality] =
    useState<RenderQuality>("4K");
  const [fullscreenZoomQuality, setFullscreenZoomQuality] =
    useState<RenderQuality>("4K");
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [fullscreenShowThumbnails, setFullscreenShowThumbnails] =
    useState(true);
  const [allowFullscreen, setAllowFullscreen] = useState(true);
  const [showActionsExample, setShowActionsExample] = useState(true);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [defaultCamera, setDefaultCamera] = useState<
    ViewerCameraId | undefined
  >(undefined);
  const [layout, setLayout] = useState<ViewerLayout>("default");
  const [debugCameraId, setDebugCameraId] = useState<string | undefined>(
    () => INITIAL_CAMERAS[0],
  );
  const demoActions = useMemo<ViewerAction[]>(
    () => [
      {
        key: "download",
        label: "Bild herunterladen",
        icon: <DownloadIcon />,
        onClick: () => setLastAction("Download"),
      },
      {
        key: "share",
        label: "Konfiguration teilen",
        icon: <ShareIcon />,
        onClick: () => setLastAction("Teilen"),
      },
    ],
    [],
  );
  const snippet = viewerExample({
    baseUrl: BASE_URL,
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
    actionsExample: showActionsExample,
    layout,
  });

  function handleCamerasChange(nextCameras: readonly ViewerCameraId[]) {
    setCameras(nextCameras);
    setDebugCameraId((current) =>
      current !== undefined && nextCameras.some((id) => id === current)
        ? current
        : nextCameras[0],
    );
    setDefaultCamera((current) =>
      current !== undefined && nextCameras.some((id) => id === current)
        ? current
        : undefined,
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-[100px] shrink-0 items-center border-b border-[#dce3eb] bg-white px-6">
        Ich bin der Header
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-10 max-[900px]:px-3 max-[900px]:py-6">
          <div className="grid min-w-0 gap-6">
            <section
              ref={viewerRoot}
              className="preview min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white"
              aria-label="Viewer-Demo"
            >
              <ViewerErrorBoundary
                resetKey={JSON.stringify([
                  configuration,
                  cameras,
                  defaultCamera,
                  layout,
                  quality,
                  zoomQuality,
                  fullscreenQuality,
                  fullscreenZoomQuality,
                  enableFullscreenZoom,
                  maxZoom,
                  fullscreenMaxZoom,
                  showThumbnails,
                  fullscreenShowThumbnails,
                ])}
              >
                <DemoViewer
                  layout={layout}
                  baseUrl={BASE_URL}
                  className="[--civ-background:#eef3f7]"
                  configuration={configuration}
                  cameras={cameras}
                  {...(defaultCamera === undefined ? {} : { defaultCamera })}
                  quality={quality}
                  zoomQuality={zoomQuality}
                  fullscreenQuality={fullscreenQuality}
                  fullscreenZoomQuality={fullscreenZoomQuality}
                  showThumbnails={showThumbnails}
                  fullscreenShowThumbnails={fullscreenShowThumbnails}
                  enableZoom={enableZoom}
                  enableFullscreenZoom={enableFullscreenZoom}
                  maxZoom={maxZoom}
                  fullscreenMaxZoom={fullscreenMaxZoom}
                  allowFullscreen={allowFullscreen}
                  actions={showActionsExample ? demoActions : undefined}
                  thumbnailQuality="FHD"
                  onFrameChange={(change) => {
                    setDebugCameraId(change.frame.cameraId);
                  }}
                  labels={{
                    viewer: "Fahrzeugansicht",
                    previous: "Zurueck",
                    next: "Weiter",
                    frames: "Kamera auswaehlen",
                    loading: "Bild wird geladen...",
                    error:
                      "Bild konnte nicht geladen werden. Render-URL und Konfiguration pruefen.",
                    retry: "Erneut versuchen",
                    empty: "Keine Kameras vorhanden.",
                    instructions:
                      "Horizontal wischen oder Pfeiltasten nutzen. Home und End waehlen die erste und letzte Kamera.",
                    resetZoom: "Zoom zuruecksetzen",
                    zoomInstructions:
                      "Mit dem Mausrad zoomen, vergroessertes Bild durch Ziehen verschieben. Escape setzt den Zoom zurueck.",
                  }}
                />
              </ViewerErrorBoundary>
            </section>
            <section className="debug-panel min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white p-6">
              <ViewerDebugPanel
                viewerRoot={viewerRoot}
                cameraId={debugCameraId}
              />
            </section>
            <section className="usage min-w-0 overflow-hidden rounded-xl border border-[#dce3eb] bg-white p-6">
              <pre className="m-0 overflow-x-auto rounded-lg bg-[#18212d] p-[18px] leading-[1.7] text-[#e7edf4]">
                <code>{snippet}</code>
              </pre>
            </section>
          </div>
        </main>
        <aside className="w-[400px] shrink-0 overflow-y-auto border-l border-[#dce3eb] bg-white p-6">
          <ViewerLayoutSelector value={layout} onChange={setLayout} />
          <h2 className={headingStyles}>Normaler Modus</h2>
          <label className="zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={enableZoom}
              onChange={(event) => setEnableZoom(event.target.checked)}
            />
            Mausrad-Zoom aktivieren
          </label>
          <label className="mb-6 block text-sm font-semibold">
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
          <QualitySelector
            label="Zoom-Qualitaet"
            value={zoomQuality}
            onChange={setZoomQuality}
          />
          <label className="zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={showThumbnails}
              onChange={(event) => setShowThumbnails(event.target.checked)}
            />
            Thumbnails anzeigen
          </label>
          <hr className="my-6 border-0 border-t border-[#dce3eb]" />
          <h2 className={headingStyles}>Fullscreen-Modus</h2>
          <label className="zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={allowFullscreen}
              onChange={(event) => setAllowFullscreen(event.target.checked)}
            />
            Fullscreen-Button erlauben
          </label>
          <label className="zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={enableFullscreenZoom}
              onChange={(event) =>
                setEnableFullscreenZoom(event.target.checked)
              }
            />
            Fullscreen-Mausrad-Zoom aktivieren
          </label>
          <label className="mb-6 block text-sm font-semibold">
            Fullscreen Maximaler Zoom
            <select
              className={`mt-2 block w-full rounded-md border border-[#9caabd] bg-white p-2.5 ${focusStyles}`}
              value={fullscreenMaxZoom}
              onChange={(event) =>
                setFullscreenMaxZoom(Number(event.target.value))
              }
            >
              {MAX_ZOOM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}x
                </option>
              ))}
            </select>
          </label>
          <QualitySelector
            label="Fullscreen-Qualitaet"
            value={fullscreenQuality}
            onChange={setFullscreenQuality}
          />
          <QualitySelector
            label="Fullscreen-Zoom-Qualitaet"
            value={fullscreenZoomQuality}
            onChange={setFullscreenZoomQuality}
          />
          <label className="zoom-toggle mb-6 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={fullscreenShowThumbnails}
              onChange={(event) =>
                setFullscreenShowThumbnails(event.target.checked)
              }
            />
            Fullscreen Thumbnails anzeigen
          </label>
          <hr className="my-6 border-0 border-t border-[#dce3eb]" />
          <label className="zoom-toggle mb-2 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className={`size-[18px] max-w-full ${focusStyles}`}
              checked={showActionsExample}
              onChange={(event) => setShowActionsExample(event.target.checked)}
            />
            Beispiel-Actions anzeigen
          </label>
          {showActionsExample && (
            <p className={`mb-6 text-xs ${paragraphStyles}`}>
              Zuletzt geklickte Aktion:{" "}
              <strong>{lastAction ?? "noch keine"}</strong>
            </p>
          )}
          <CameraSelector cameras={cameras} onChange={handleCamerasChange} />
          <DefaultCameraSelector
            cameras={cameras}
            value={defaultCamera}
            onChange={setDefaultCamera}
          />
          <h2 className={headingStyles}>Konfiguration</h2>
          <ConfigurationEditor
            initialConfiguration={INITIAL_CONFIGURATION}
            onApply={setConfiguration}
          />
          <hr className="my-6 border-0 border-t border-[#dce3eb]" />
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

      <footer className="flex h-[100px] shrink-0 items-center border-t border-[#dce3eb] bg-white px-6">
        Ich bin der Footer
      </footer>
    </div>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("Demo root element is missing.");
createRoot(container).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
