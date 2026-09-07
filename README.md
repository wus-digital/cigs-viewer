# cigs-viewer

Repository: [wus-digital/cigs-viewer](https://github.com/wus-digital/cigs-viewer).

React-/TypeScript-Viewer fuer den CIGS-Render-Service. Der Viewer erhaelt eine
`configuration` als Key-Value-Objekt sowie Exterieur- und Interieur-Kameras und
baut daraus alle Bildpfade selbst. **Keine manuellen Bild-URL-Arrays.**

Beide Ansichten verwenden normale durchwischbare Bilder: kein Unreal, Arcware,
WebGL oder Fisheye. Keine Runtime Dependencies ausser React/React DOM als Peers.

## Installation

Nach Veroeffentlichung auf npm:

```bash
npm install cigs-viewer react react-dom
```

React/React DOM 18.2+ oder 19.x, ESM und TypeScript-Deklarationen.
Eine Veroeffentlichung auf GitHub ist noch keine Veroeffentlichung auf npm.

## Verwendung

```tsx
import { CigsViewer } from 'cigs-viewer';
import 'cigs-viewer/styles.css';

const configuration = {
  B: '01',
  M: '01',
  P: '070707',
  PMV: '100',
};

export function Preview() {
  return (
    <CigsViewer
      baseUrl='https://renders.example.com'
      configuration={configuration}
      quality='FHD'
      labels={{
        viewer: 'Fahrzeugansicht',
        exterior: 'Exterieur',
        interior: 'Interieur',
        previous: 'Vorheriges Bild',
        next: 'Naechstes Bild',
      }}
    />
  );
}
```

`baseUrl` ist nur die Adresse des Render-Service, kein fertiger Bildpfad.
Die Host-App kann ihren ENV-Wert dafuer uebergeben; das Paket liest keine
projektspezifischen Umgebungsvariablen und verwendet keinen fest eingebauten Host.

### Default-Kameras

Ohne Kamera-Props gelten in genau dieser Swipe-Reihenfolge:

- **Exterieur:** `C1`, `C2`, `C3`, `C4`, `C5`, `C9`, `C10`
- **Interieur:** `C6`, `C7`, `C8`, `C11`, `C12`, `C13`, `C14`

Eigene `exteriorCameras`-/`interiorCameras`-Arrays von `{ id, label? }`
ueberschreiben die jeweilige Ansicht unabhaengig. Ein explizites `[]` laesst
die Ansicht leer. Die unveraenderlichen Defaults sind als
`DEFAULT_EXTERIOR_CAMERAS` und `DEFAULT_INTERIOR_CAMERAS` exportiert.

### So werden die Pfade gebaut

```text
{baseUrl}/{key}{value}_{key}{value}_{camera.id}_PQM-{quality}.webp
```

Fuer die obige Konfiguration entstehen automatisch beispielsweise:

```text
https://renders.example.com/B01_M01_P070707_PMV100_C1_PQM-FHD.webp
https://renders.example.com/B01_M01_P070707_PMV100_C6_PQM-FHD.webp
```

- Die Kamera-ID ist der **vollstaendige Kamera-Token im Dateinamen**, nicht ein
  Pfad und nicht ein Alias fuer eine Fisheye-Yaw-/Pitch-Position. IDs werden weder
  umgeschrieben noch automatisch mit `C360`/`C360INT` ergaenzt.
- Die Reihenfolge der Kamera-Arrays bestimmt die Swipe-Reihenfolge. Beide
  Ansichten duerfen unterschiedlich viele Kameras haben.
- Die `Object.entries(configuration)`-Reihenfolge bleibt wie im bisherigen
  Render-Builder erhalten. Die Keys werden **nicht alphabetisch sortiert**.
- `''`, `undefined` und `null` werden ausgelassen; numerische Werte einschliesslich
  `0` werden als Text angehaengt. Fuer fuehrende Nullen Strings wie `'01'` verwenden.
- Die bisherigen CIGS-Filter sind Standard: Exterieur ohne `AKZI` und `DHC`,
  Interieur ohne `AKZ`. Anpassbar mit
  `omittedConfigurationKeys={{ exterior: [], interior: [] }}`; ein explizites
  leeres Array deaktiviert den Filter fuer die jeweilige Ansicht.
- Qualitaeten: `FHD`, `WQHD`, `4K`, `4KHQ`, `8K`, `8KHQ`; Standard `FHD`.
  Der Render-Service muss die gewaehlte Qualitaet fuer die Kamera anbieten.
- Die Dateiendung ist `.webp`, entsprechend dem vorhandenen CIGS-Schema.

Das Paket enthaelt weder Produktbilder noch einen Render-Service.
**Das bisherige einzelne `C360INT`-Panorama wird nicht in Kamera-Einzelbilder
konvertiert.** Fuer das neue Interieur werden reale perspektivische Renderings
mit den konfigurierten Kamera-IDs benoetigt.

### Konfiguration aendern

Ein neues `configuration`-Objekt uebergeben, beispielsweise
`{ ...configuration, P: 'FFFFFF' }`. Der Viewer baut aktuelle Bilder,
Nachbar-Preloads und Thumbnails neu auf. Die gemerkten Bildindizes fuer beide
Ansichten bleiben erhalten. Bei kuerzeren Kameralisten wird der Index begrenzt.
Kameralisten ebenfalls unveraenderlich behandeln und als neue Arrays uebergeben.

### Externe Kamerasteuerung

```tsx
'use client';

import { useState } from 'react';
import {
  CigsViewer,
  DEFAULT_EXTERIOR_CAMERAS,
  DEFAULT_INTERIOR_CAMERAS,
  type ViewerRenderOptions,
  type ViewerViewMode,
} from 'cigs-viewer';
import 'cigs-viewer/styles.css';

export function ControlledPreview(props: ViewerRenderOptions) {
  const [viewMode, setViewMode] = useState<ViewerViewMode>('exterior');
  const [cameraIds, setCameraIds] = useState({
    exterior: (props.exteriorCameras ?? DEFAULT_EXTERIOR_CAMERAS)[0]?.id,
    interior: (props.interiorCameras ?? DEFAULT_INTERIOR_CAMERAS)[0]?.id,
  });
  const cameraId = cameraIds[viewMode];

  return (
    <CigsViewer
      {...props}
      viewMode={viewMode}
      {...(cameraId === undefined ? {} : { cameraId })}
      onViewModeChange={setViewMode}
      onFrameChange={({ viewMode: mode, frame }) =>
        setCameraIds((current) => ({ ...current, [mode]: frame.cameraId }))
      }
    />
  );
}
```

`cameraId` waehlt eine Kamera in der aktiven Ansicht. Mit
`onFrameChange` uebernimmt die Host-App den gewuenschten Wechsel nach Swipe,
Tastatur oder Button. Kontrollierte Props aendern sich erst, wenn der Host sie
aktualisiert. `viewMode` und `cameraId` beim externen Ansichtwechsel gemeinsam
aktualisieren; die ID muss in der neuen Ansicht existieren.

Alternativ ist `frameIndex` als nullbasierter kontrollierter Index verfuegbar.
**Nicht gleichzeitig mit `cameraId` verwenden.** Ohne beide Props verwaltet
der Viewer die Indizes selbst. Bei veraenderlichen Kameralisten muss die
Host-App kontrollierte Kamera-IDs ebenfalls aktualisieren.

## API

| Prop | Default | Bedeutung |
| --- | --- | --- |
| `configuration` | erforderlich | `Readonly<Record<string, string \| number \| null \| undefined>>` |
| `baseUrl` | erforderlich | HTTP(S)-Adresse oder Root-relatives Verzeichnis wie `/renders` |
| `exteriorCameras` | `C1, C2, C3, C4, C5, C9, C10` | Optionales Array von `{ id, label? }` |
| `interiorCameras` | `C6, C7, C8, C11, C12, C13, C14` | Optionales Array von `{ id, label? }` |
| `quality` | `FHD` | CIGS-Qualitaet der dargestellten Bilder und Preloads |
| `thumbnailQuality` | - | Optionale Thumbnail-Qualitaet; ebenfalls automatisch erzeugte Pfade |
| `omittedConfigurationKeys` | Ext: `AKZI`, `DHC`; Int: `AKZ` | Optionale Filter pro Ansicht |
| `viewMode` / `defaultViewMode` | intern / `exterior` | Kontrollierte bzw. initiale Ansicht |
| `cameraId` | intern | Kontrollierte Kamera-ID in der aktiven Ansicht |
| `frameIndex` / `defaultFrameIndex` | intern / `0` | Kontrollierter bzw. initialer nullbasierter Index |
| `onViewModeChange` | - | `(viewMode) => void` |
| `onFrameChange` | - | `({ viewMode, frameIndex, frame }) => void`; `frame` enthaelt `cameraId`, `src`, optional `alt`, `thumbnailSrc` |
| `onImageError` | - | `(error, change) => void` fuer das angezeigte Bild |
| `loop` | `true` | Zyklische Navigation |
| `pixelsPerFrame` | `24` | Positive ganzzahlige Drag-Distanz in CSS-Pixeln |
| `preloadRadius` | `1` | 0-4 Nachbarbilder pro Richtung, nur aktive Ansicht |
| `showThumbnails` | `false` | Thumbnail-Leiste; ohne `thumbnailQuality` nur nummerierte Buttons |
| `labels` | Englisch | Teilmenge von `ViewerLabels`, inklusive Lade-, Fehler-, Retry- und Anleitungstexten |
| `className`, `style` | - | Gestaltung des Containers |

Callbacks melden Interaktionen, nicht Mount, Konfigurationsaenderungen oder
automatisches Begrenzen von Indizes. Generierte URLs sind **Ausgabedaten** in
Callbacks, keine manuell zu uebergebenden Props. `ViewerFrame` ist ein Ausgabetyp.
Der interne Bild-Renderer ist kein oeffentlicher Package-Export.

Leere Kameralisten zeigen einen Leerzustand. Nach dem Filtern muss mindestens
ein Konfigurationscode uebrig bleiben. Doppelte Kamera-IDs innerhalb einer
Ansicht, unbekannte kontrollierte Kamera-IDs und ungueltige Optionen werfen
explizite Fehler fuer eine Host-Error-Boundary.

Dateinamen-Tokens erlauben Buchstaben, Ziffern, `_` und `-`. Pfade, Querystrings
und URL-Steuerzeichen sind in Konfigurationswerten oder Kamera-IDs nicht erlaubt.
`baseUrl` darf weder Zugangsdaten noch Querystring oder Hash enthalten.
Bildladefehler sind sichtbar, werden gemeldet und koennen erneut versucht werden.

## Styling, Performance und Next.js

- CSS mit `import 'cigs-viewer/styles.css'` laden.
- CSS-Variablen: `--civ-background`, `--civ-foreground`, `--civ-accent`,
  `--civ-aspect-ratio` (Standard `16 / 9`).
- Normale Bilder mit `object-fit: contain`, keine Verzerrung oder 3D-Projektion.
- Maus, Touch, Stift, Pfeiltasten, Home/End; vertikales Scrollen bleibt erlaubt.
- Standardmaessig zwei Nachbarbilder statt der gesamten Sequenz; inaktive Ansicht
  wird nicht vorgeladen. `preloadRadius={0}` deaktiviert Preloading.
- `showThumbnails` mit passender `thumbnailQuality` kombinieren; der Service muss
  die gewaehlte Aufloesung bereitstellen. Browser-Cache und Server-Cache-Header
  bestimmen die Wiederverwendung; kein unbegrenzter eigener Decoded-Image-Cache.
- ESM-Entry behaelt `'use client'`, keine DOM-Zugriffe beim Server-Render.
  In Next.js sind `ssr: false` und `transpilePackages` nicht erforderlich.
  Konfiguration und Kameras sind serialisierbar; Callbacks/Store-Anbindung
  gehoeren in ein Client Component.
- Host verantwortet CDN, CSP, Autorisierung und den Render-Service.
  Keine Secrets in `configuration` oder URLs uebergeben.

Nicht enthalten: Streaming, Fisheye, WebGL, 3D-Hotspots, Kamera-Fokusanimationen,
Zoom/Panning, 3D-Sitzkonfiguration, Grid- oder Fullscreen-Praesentationsmodus.

## Migration von 0.1.x

Ab **0.2.0** ersetzen `configuration`, `baseUrl`, `exteriorCameras` und
`interiorCameras` die bisherigen `exteriorFrames`-/`interiorFrames`-Props.
Die Host-App braucht keine URL-Builder mehr. `thumbnailSrc` wird durch
`thumbnailQuality` ersetzt. Die Navigations-Callbacks bleiben bestehen;
Frames enthalten jetzt die Kamera-ID.

Ab **0.2.1** sind beide Kamera-Props optional und verwenden die oben genannten
Defaults. Bestehende explizite Kamera-Arrays behalten unveraendert ihre Wirkung.

Ab **0.3.0** heissen die Komponente `CigsViewer` und ihr Props-Typ `CigsViewerProps`.
Die bisherigen Namen `ConfiguratorImageViewer` und `ConfiguratorImageViewerProps`
werden nicht mehr exportiert. Imports und JSX entsprechend umbenennen;
Props und Verhalten bleiben unveraendert.

## Entwicklung und lokale Installation

```bash
git clone git@github.com:wus-digital/cigs-viewer.git
cd cigs-viewer
npm ci
npm run lint
npm test
npm pack --dry-run
npm pack

# In einer separaten React-App:
npm install /absoluter/pfad/cigs-viewer-0.3.0.tgz
```

`npm test` baut mit TypeScript, prueft den oeffentlichen Typvertrag und fuehrt
Node-/JSDOM-Tests auf den erzeugten ESM-Dateien aus. `npm pack` baut erneut.
Das Tarball enthaelt nur `dist`, README und Metadaten, keine Host-App oder Assets.

## Veroeffentlichung

1. Rechte fuer den npm-Namen `cigs-viewer` pruefen; GitHub reserviert den Namen nicht.
2. Lizenz festlegen: `UNLICENSED` vergibt bewusst keine Open-Source-Rechte.
3. `npm ci && npm run lint && npm test && npm pack --dry-run`.
4. Bei Bedarf Version mit `npm version patch --no-git-tag-version` erhoehen.
5. Nach Freigabe: `npm login` und `npm publish --access public`.

`prepublishOnly` fuehrt Lint und Tests aus. Fuer CI Trusted Publishing bzw.
CI-Secrets verwenden, keine Tokens committen. Kein automatisches npm-Publishing.
