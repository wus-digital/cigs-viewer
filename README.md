# cigs-viewer

Repository: [wus-digital/cigs-viewer](https://github.com/wus-digital/cigs-viewer).

Eigenstaendiger React-/TypeScript-Viewer fuer bildbasierte Exterieur- und
Interieur-Sequenzen. Beide Ansichten verwenden denselben Renderer und dieselbe
Swipe-Logik. Keine Laufzeitabhaengigkeit von Next.js, Tailwind, Zustand, Three.js,
Pannellum, Unreal oder Arcware.

## Funktionsumfang

- Maus-/Touch-/Stift-Drag, Vor/Zurueck, Pfeiltasten, Home und End.
- Umschaltung zwischen Exterieur und Interieur; separate gemerkte Bildpositionen.
- Optional steuerbare Ansicht und Bildposition fuer externe Configurator-Controls.
- Optionaler Loop und optionale Thumbnail-Leiste.
- Standardmaessig nur das aktuelle Bild und zwei benachbarte Bilder der aktiven
  Ansicht, kein Vorladen kompletter 120-Frame-Sequenzen.
- Lade-, Leer- und Fehlerzustaende mit Retry und Fehler-Callback.
- Anpassbare Texte, CSS-Variablen, sichtbarer Tastaturfokus und mehrere Instanzen.
- ESM und TypeScript-Deklarationen. SSR-kompatibler `use client`-Entry fuer Next.js.

Bewusst nicht enthalten: Streaming, Fisheye-/Panorama-Projektion, WebGL,
3D-Hotspots, Kamera-Fokusfahrten, Zoom/Panning, 3D-Sitzkonfiguration, Grid- und
Fullscreen-Praesentationsmodus. Der bestehende App-Viewer wird nicht ersetzt.

## Installation

Nach Veroeffentlichung auf npm:

```bash
npm install cigs-viewer react react-dom
```

React und React DOM sind Peer Dependencies (18.2+ oder 19.x).
Das Paket liefert ESM, keinen separaten CommonJS-Build.

## Verwendung

```tsx
import { ConfiguratorImageViewer } from 'cigs-viewer';
import 'cigs-viewer/styles.css';

const exteriorFrames = Array.from({ length: 120 }, (_, index) => ({
  src: `/renders/exterior/${String(index + 1).padStart(3, '0')}.webp`,
  alt: `Exterieur, Ansicht ${index + 1}`,
}));

const interiorFrames = [
  { src: '/renders/interior/dashboard.webp', alt: 'Armaturenbrett' },
  { src: '/renders/interior/seats.webp', alt: 'Sitze' },
  { src: '/renders/interior/door.webp', alt: 'Tuerverkleidung' },
];

export function Preview() {
  return (
    <ConfiguratorImageViewer
      exteriorFrames={exteriorFrames}
      interiorFrames={interiorFrames}
      labels={{
        viewer: 'Fahrzeugansicht',
        exterior: 'Exterieur',
        interior: 'Interieur',
        previous: 'Vorheriges Bild',
        next: 'Naechstes Bild',
        loading: 'Bild wird geladen...',
        empty: 'Fuer diese Ansicht sind keine Bilder vorhanden.',
        error: 'Das Bild konnte nicht geladen werden.',
        retry: 'Erneut versuchen',
        frames: 'Bild auswaehlen',
        instructions: 'Horizontal wischen oder die Pfeiltasten verwenden. Home und End waehlen das erste und letzte Bild.',
      }}
    />
  );
}
```

Die URLs sind Beispiele; das Paket enthaelt keine Produktbilder und keinen
Render-Service. Bilder werden in Array-Reihenfolge angezeigt. Interieur und
Exterieur duerfen unterschiedlich viele Bilder haben. `src` muss eine nichtleere
Bild-URL sein; leere Arrays zeigen einen expliziten Leerzustand.

**Das bisherige `C360INT`-Panorama ist kein geeignetes Einzelbild.** Fuer das neue
Interieur muessen normale perspektivische Renderings bereitgestellt werden.
Das Paket konvertiert keine Panoramen und erfindet keine Render-API-Endpunkte.

### Next.js App Router

CSS beispielsweise im Root-Layout importieren. Der Paket-Entry behaelt
`'use client'`; ein zusaetzliches `dynamic(..., { ssr: false })` ist nicht notwendig.
Die reinen URL-Arrays koennen aus einem Server Component kommen. Callbacks,
React-State und Store-Anbindung gehoeren in ein Client Component.
`transpilePackages` ist fuer den kompilierten ESM-Build nicht erforderlich.

### Externe Steuerung / Store-Anbindung

```tsx
'use client';

import { useState } from 'react';
import {
  ConfiguratorImageViewer,
  type ViewerFrame,
  type ViewerViewMode,
} from 'cigs-viewer';
import 'cigs-viewer/styles.css';

export function ControlledPreview({
  exteriorFrames,
  interiorFrames,
}: {
  exteriorFrames: readonly ViewerFrame[];
  interiorFrames: readonly ViewerFrame[];
}) {
  const [viewMode, setViewMode] = useState<ViewerViewMode>('exterior');
  const [indices, setIndices] = useState({ exterior: 0, interior: 0 });

  return (
    <ConfiguratorImageViewer
      exteriorFrames={exteriorFrames}
      interiorFrames={interiorFrames}
      viewMode={viewMode}
      frameIndex={indices[viewMode]}
      onViewModeChange={setViewMode}
      onFrameChange={({ viewMode: mode, frameIndex }) =>
        setIndices((current) => ({ ...current, [mode]: frameIndex }))
      }
      onImageError={(error, { viewMode: mode, frameIndex }) => {
        console.error('Viewer image failed', { error, mode, frameIndex });
      }}
    />
  );
}
```

`onFrameChange` meldet Navigation innerhalb der aktiven Ansicht, nicht den
initialen Mount, Moduswechsel oder das Clamp nach einer Datenaktualisierung.
`onViewModeChange` meldet den gewuenschten Moduswechsel. Kontrollierte Props
aendern sich erst, wenn der Host sie aktualisiert.

Die App kann ihre vorhandene Exterieur-URL-Funktion weiterhin **ausserhalb** des
Pakets verwenden:

```tsx
const exteriorFrames = Array.from({ length: 120 }, (_, index) => ({
  src: buildExteriorFrameUrl(configuration, index + 1, 'FHD'),
}));
```

`buildExteriorFrameUrl` stammt aus der Host-App, nicht aus diesem Paket. Die
Interieur-URLs kommen aus dem eigenen Asset-Manifest oder Render-Service.
Neue Konfigurationen als neue Arrays uebergeben; die Bildposition bleibt erhalten.
Bei weniger Bildern wird auf den letzten gueltigen Index begrenzt. Fuer einen
vollstaendigen Reset kann der Host einen neuen React-`key` setzen.

## API

| Prop | Default | Bedeutung |
| --- | --- | --- |
| `exteriorFrames`, `interiorFrames` | erforderlich | Readonly-Arrays von `{ src, alt?, thumbnailSrc? }` |
| `viewMode` / `defaultViewMode` | intern / `exterior` | Kontrollierter bzw. initialer Modus |
| `frameIndex` / `defaultFrameIndex` | intern / `0` | Nullbasierter Index; Default gilt initial fuer beide Ansichten |
| `onViewModeChange` | - | `(mode) => void` |
| `onFrameChange` | - | `({ viewMode, frameIndex, frame }) => void` |
| `onImageError` | - | `(error, { viewMode, frameIndex, frame }) => void` fuer das angezeigte Bild |
| `loop` | `true` | Navigation am Ende zyklisch fortsetzen |
| `pixelsPerFrame` | `24` | Positive ganzzahlige Drag-Distanz in CSS-Pixeln pro Bild |
| `preloadRadius` | `1` | 0-4 Nachbarbilder pro Richtung, nur aktive Ansicht; 0 deaktiviert Preloading |
| `showThumbnails` | `false` | Thumbnail-Leiste; ohne `thumbnailSrc` wird nur eine Nummer angezeigt |
| `labels` | Englisch | Teilmenge von `ViewerLabels` |
| `className`, `style` | - | Gestaltung des Containers |

Ungueltige numerische Optionen und leere Bild-URLs werfen explizite Fehler.
Der Host kann diese mit seiner React Error Boundary behandeln. Bildladefehler
haben einen eigenen sichtbaren Fehlerzustand; der Callback ist optional.
Spekulatives Nachbar-Preloading blockiert den Viewer nicht. Ein defektes
Nachbarbild wird erst bei seiner Auswahl als Fehler gemeldet.

## Styling und Performance

```css
.my-viewer {
  --civ-background: #fff;
  --civ-foreground: #111;
  --civ-accent: #0062bd;
  --civ-aspect-ratio: 16 / 9;
}
```

`className="my-viewer"` setzen. Der Viewer reserviert per `aspect-ratio` Platz;
`object-fit: contain` zeigt das vollstaendige Bild ohne Verzerrung. Native
Touch-Gesten erlauben weiterhin vertikales Scrollen und Browser-Pinch-Zoom.

Passend dimensionierte WebP-/AVIF-Dateien und kleine separate Thumbnails liefern.
Ein engeres Preload-Fenster reduziert Requests, garantiert aber kein ruckelfreies
Abspielen unbesuchter Bilder bei langsamen Verbindungen. Es wird kein eigener
unbegrenzter Decoded-Image-Cache angelegt; Browser-Cache und Cache-Header des
Bildservers bestimmen die Wiederverwendung. Stabile, versionierte URLs mit
langem Public-Cache nur fuer oeffentliche Assets verwenden.

Der Host verantwortet CDN, CORS/CSP, Berechtigungen und URL-Erzeugung. Keine
privaten API-Schluessel in Bild-URLs uebergeben. Keine externen Skripte, Fonts,
Telemetrie oder Requests zu fest eingebauten Hosts.

## Entwicklung und lokale Integration

Dieses Repository ist ein eigenstaendiges npm-Projekt.
`jsdom` ist ausschliesslich eine Dev Dependency fuer DOM-Interaktionstests; der
Test-Runner ist Node.js `node:test`. TypeScript und ESLint verwenden die bereits
im Repository eingesetzten Werkzeuge.

```bash
git clone git@github.com:wus-digital/cigs-viewer.git
cd cigs-viewer
npm ci
npm run lint
npm test
npm pack --dry-run
npm pack

# In einer separaten React-App:
npm install /absoluter/pfad/cigs-viewer-0.1.0.tgz
```

`npm test` baut zuerst und testet die erzeugten ESM-Dateien. `npm pack` baut ueber
`prepack` neu. Das Tarball enthaelt nur `dist`, README und Paketmetadaten, keine
App-Dateien, Umgebungsdateien, Testdaten oder Produktbilder.

## Veroeffentlichung

1. Veroeffentlichungsrechte fuer den npm-Namen `cigs-viewer` pruefen.
   Das GitHub-Repository reserviert nicht automatisch den gleichnamigen npm-Namen.
2. Lizenz entscheiden. `UNLICENSED` vergibt bewusst **keine** Open-Source-Rechte;
   vor oeffentlicher Nutzung die gewuenschten Lizenzbedingungen hinterlegen.
3. Bei Namensaenderungen den Lockfile mit `npm install --package-lock-only`
   aktualisieren; Beispiele/Imports anpassen.
4. `npm ci && npm run lint && npm test && npm pack --dry-run` ausfuehren.
5. Version bei Bedarf mit `npm version patch --no-git-tag-version` erhoehen.
6. Nach Review des Paketumfangs mit dem berechtigten npm-Konto veroeffentlichen:

```bash
npm login
npm publish --access public
```

`prepublishOnly` fuehrt Lint und Tests aus. Fuer CI npm Trusted Publishing bzw.
CI-Secrets und die passende npm-Konfiguration verwenden, keine Tokens committen.
Es wurde kein Paket automatisch in eine Registry veroeffentlicht.
