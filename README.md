# cigs-viewer

Repository: [wus-digital/cigs-viewer](https://github.com/wus-digital/cigs-viewer).

React-/TypeScript-Viewer fuer den CIGS-Render-Service. Der Viewer erhaelt eine
`configuration` als Key-Value-Objekt sowie eine optionale `cameras`-Auswahl und
baut daraus alle Bildpfade selbst. **Keine manuellen Bild-URL-Arrays.**

Beide Ansichten verwenden normale durchwischbare Bilder: kein Unreal, Arcware,
WebGL oder Fisheye. Keine Runtime Dependencies ausser React/React DOM als Peers.

## Installation

Nach Veroeffentlichung auf npm:

```bash
npm install cigs-viewer react react-dom
```

React/React DOM 18.2+ oder 19.x, ESM und TypeScript-Deklarationen.
Fuer das Styling wird **Tailwind CSS 4** im Build der Host-App benoetigt.
Eine Veroeffentlichung auf GitHub ist noch keine Veroeffentlichung auf npm.

### Tailwind einbinden

Das Paket enthaelt ausschliesslich Tailwind-Utilities, **kein eigenes Stylesheet**.
Ein bisheriger Import von `cigs-viewer/styles.css` muss entfernt werden.
In der bestehenden Tailwind-Einstiegsdatei der Host-App das Paket als Quelle
registrieren (hier liegt die Datei direkt in `src/`):

```css
@import "tailwindcss";
@source "../node_modules/cigs-viewer/dist";
```

Der `@source`-Pfad ist relativ zu dieser Einstiegsdatei und muss gegebenenfalls
angepasst werden. `node_modules` wird nicht automatisch gescannt. Auch bei
Installation per Tarball oder lokalem `file:`-Verweis muss der gebaute Paketinhalt
gescannt werden, einschliesslich `dist/constants/`.
Die Host-App bindet ihren eigenen generierten Tailwind-Output wie gewohnt ein.
Ohne Tailwind-Build bzw. ohne diese Quellenregistrierung ist der Viewer ungestaltet.
Die Demo zeigt die Integration mit dem offiziellen `@tailwindcss/vite`-Plugin.

## Verwendung

```tsx
import { CigsViewer } from 'cigs-viewer';

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
      cameras={['C1', 'C2', 'C6']}
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

### System-Kameras und Auswahl

Der feste System-Katalog enthaelt diese maximal verfuegbaren Kameras:

- **Exterieur:** `C1`, `C2`, `C3`, `C4`, `C5`, `C9`, `C10`
- **Interieur:** `C6`, `C7`, `C8`, `C11`, `C12`, `C13`, `C14`

Mit `cameras={['C1', 'C6']}` werden nur diese IDs verwendet. Die Zuordnung zu
Exterieur/Interieur erfolgt automatisch, die Reihenfolge innerhalb einer Ansicht
folgt der uebergebenen Liste. Unbekannte oder doppelte IDs werden abgelehnt.
Ohne `cameras` wird der komplette Katalog verwendet; `cameras={[]}` bleibt leer.

```tsx
// Einzelbild, ohne Swipe, Navigationspfeile oder Ansichtswechsel:
<CigsViewer baseUrl={baseUrl} configuration={configuration} cameras={['C1']} />
// Nur Interieur; ohne kontrolliertes viewMode automatisch die richtige Ansicht:
<CigsViewer baseUrl={baseUrl} configuration={configuration} cameras={['C6']} />
```

Ein Ansichtswechsel erscheint nur, wenn beide Bereiche mindestens eine Kamera
enthalten. Bei einer Kamera pro Ansicht erfolgt der Wechsel ueber dieses
Thumbnail, nicht durch Wischen. Zoom und Verschieben funktionieren auch beim Einzelbild.
Bei kontrolliertem `viewMode`/`cameraId` muss der Host weiterhin eine zur Auswahl
passende Ansicht und Kamera liefern.

`EXTERIOR_CAMERAS` und `INTERIOR_CAMERAS` exportieren den unveraenderlichen Katalog;
`ViewerCameraId` ist der zugehoerige TypeScript-ID-Typ. Die bisherigen
`DEFAULT_EXTERIOR_CAMERAS`/`DEFAULT_INTERIOR_CAMERAS` bleiben als Aliase erhalten.
Die alten `exteriorCameras`/`interiorCameras`-Props bleiben fuer bestehende
Integrationen verfuegbar, sind aber veraltet und duerfen nicht mit `cameras`
kombiniert werden. Neue Integrationen verwenden nur die gemeinsame Auswahl.

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
| `cameras` | alle System-Kameras | `readonly ViewerCameraId[]`, z. B. `['C1', 'C6']`; `[]` zeigt den Leerzustand |
| `exteriorCameras`, `interiorCameras` | jeweiliger Katalog | Veraltete separate Kamera-Arrays; nicht mit `cameras` kombinieren |
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
| `dragMode` | `'slide'` | Echter Bild-Slider; `'sequence'` aktiviert das bisherige kontinuierliche Durchschalten |
| `pixelsPerFrame` | `24` | Positive ganzzahlige Drag-Distanz in CSS-Pixeln, nur fuer `dragMode='sequence'` |
| `preloadRadius` | `'all'` | Gesamte aktive Ansicht in Nachbarpaaren; alternativ 0-4 Nachbarbilder pro Richtung |
| `showThumbnails` | `false` | Kamera-Thumbnails bei mehreren Kameras der aktiven Ansicht; ohne `thumbnailQuality` werden geladene Hauptbilder wiederverwendet |
| `enableZoom` | `false` | Mausrad-Zoom 1x-4x mit gezieltem 4K-Nachladen; Ziehen verschiebt den Ausschnitt |
| `showDebug` | `false` | Debug-Anzeige unter dem Bild: Kamera, tatsaechlich dargestellter Bildpfad, Originalaufloesung und Zoomstufe |
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

### Bildnavigation und Zoom

```tsx
<CigsViewer
  baseUrl="https://cigs.elferplatz.com"
  configuration={{ B: '01', M: '01', P: '070707', PMV: '100' }}
  cameras={['C1', 'C2', 'C6']}
  showThumbnails
  enableZoom
/>
```

Pfeile liegen links und rechts im Bild, die Thumbnail-Leiste am unteren Bildrand.
Der Bildzaehler ist nur noch fuer Screenreader vorhanden. Der Ansichtswechsel
steht im Exterieur als letztes Interieur-Thumbnail und im Interieur als erstes
Exterieur-Thumbnail. Die Vorschau zeigt die zuletzt ausgewaehlte Kamera der anderen Ansicht;
der Wechsel behaelt wie bisher deren letzte Auswahl bei. Ohne Kamera-Thumbnails
bleibt bei zwei verfuegbaren Bereichen ein beschrifteter Ansichtswechsel verfuegbar.
Fehlt einer der Bereiche, wird dieser Schalter nicht eingeblendet.
Die Thumbnail-Leiste legt keinen Verlauf oder Schleier ueber das Hauptbild.
Bei nur einer Kamera in der aktiven Ansicht wird deren Kamera-Thumbnail
automatisch ausgeblendet und nicht separat vorgeladen. Der Ansichtswechsel
bleibt verfuegbar, wenn beide Bereiche Kameras enthalten.

Pfeile, Tastatur und Thumbnails (einschliesslich Ansichtswechsel) verwenden
dieselbe Wisch-/Parallax-Animation wie Drag-Gesten. Ein Thumbnail-Sprung zeigt
direkt die ausgewaehlte Zielkamera im Hintergrund, ohne Zwischenkameras
durchzuschalten. Schnelle Eingaben schliessen die vorherige Auswahl ab und
animieren von dort weiter. Auswahl-Callbacks werden am Ende der Animation
ausgeloest; bei `prefers-reduced-motion` wird sofort gewechselt.
Klick- und Tastaturwechsel dauern 600 ms mit sanftem Anlauf und anschliessender
Beschleunigung. Das Einrasten nach einem echten Swipe bleibt bei 220 ms.

`enableZoom` aktiviert das Mausrad nur ueber der Bildflaeche, nicht ueber den
Bedienelementen. Gezoomt wird um die Mausposition, zwischen 1x und 4x.
Ab vergroesserter Darstellung verschiebt Ziehen den Ausschnitt statt Kameras
weiterzuschalten; Pfeile, Thumbnails und Tastatur bleiben bedienbar.
Escape oder "Reset zoom" setzen auf 1x zurueck. Kamera-, Ansichts- und
Konfigurationswechsel, Groessenaenderungen oder `enableZoom={false}` setzen
den Zoom ebenfalls zurueck. Ohne Zoom-Prop bleibt normales Seitenscrollen erhalten;
Strg-/Cmd-Mausrad bleibt immer dem Browser vorbehalten.
`labels.resetZoom` und `labels.zoomInstructions` sind lokalisierbar.

`showDebug` ist in der Demo aktiviert. Die Anzeige liest die Originalabmessungen
(`naturalWidth`/`naturalHeight`) des sichtbaren Bildes, nicht die CSS-Groesse.
Solange ein Ersatzbild oder 4K-Bild noch laedt, zeigt sie weiterhin die Daten
des dargestellten Fallback-Bildes. Ohne geladenes Bild stehen Pfad und Aufloesung
auf `-`. Die Texte sind ueber `labels.debug`, `debugCamera`, `debugImage`,
`debugResolution` und `debugZoom` anpassbar.

Beim Hineinzoomen wird ausschliesslich fuer den aktuellen Frame dessen
`PQM-4K`-Bild angefordert, sobald das Basisbild geladen ist. Bis die hoehere
Qualitaet bereitsteht, bleibt das Basisbild sichtbar. Kameras und Thumbnails
werden nicht pauschal in 4K vorgeladen. Bereits in 4K oder hoeher angeforderte
Basisbilder werden nicht herabgestuft oder doppelt geladen.
Ein fertig geladenes Zoom-Bild wird fuer erneutes Zoomen desselben Frames
wiederverwendet. Laufende Upgrades werden bei Zoom-Ende, Navigation oder
Konfigurationswechsel verworfen; veraltete Antworten werden ignoriert.
Bei Fehlern bleiben Basisbild und Retry bedienbar, `onImageError` erhaelt die
tatsaechlich fehlgeschlagene Zoom-URL. Das Upgrade ist eine priorisierte
Vordergrund-Anfrage, unabhaengig von den normalen Hintergrund-Paaren.

## Styling, Performance und Next.js

- Styling ausschliesslich ueber Tailwind-Utilities; die Quellenregistrierung
  oben ist erforderlich. Die `civ__*`-Klassen sind nur DOM-/Debug-Hooks,
  keine Stylesheet-Selektoren.
- CSS-Variablen: `--civ-background`, `--civ-foreground`, `--civ-accent`,
  `--civ-aspect-ratio` (Standard `16 / 9`).
- Kontinuierliche Zoom-/Swipe-Transformationen und Bild-Ladestatus bleiben
  dynamische Inline-Werte; statische Gestaltung und Animationen sind Tailwind-Klassen.
- Normale Bilder mit `object-fit: contain`, keine Verzerrung oder 3D-Projektion.
- Maus, Touch, Stift, Pfeiltasten, Home/End; vertikales Scrollen bleibt erlaubt.
- Im Standardmodus `dragMode='slide'` folgt nur das aktuelle Bild der horizontalen
  Bewegung; das Zielbild liegt dahinter und startet um 20 % der Viewer-Breite
  seitlich versetzt. Es bewegt sich mit einem Fuenftel der Drag-Strecke ins
  Zentrum (Parallax). Beim Einrasten enden beide Bewegungen synchron.
  Sobald eine horizontale Wischbewegung erkennbar ist (2 CSS-Pixel gegen Klickzittern),
  reicht das Loslassen zum Einrasten einer Kamera in diese Richtung. Es gibt
  keine Mindestdistanz relativ zur Viewer-Breite. Die letzte Bewegungsrichtung
  entscheidet, auch wenn der Finger zum Startpunkt zurueckkehrt. Neue Gesten
  waehrend des Einrastens schliessen den vorherigen Wechsel sofort ab und werden
  nicht verworfen. Auch bei Capture-Verlust wird eine erkannte Geste uebernommen;
  echte Pointer-Abbrueche (z. B. natives Scrollen) wechseln keine Kamera.
  `prefers-reduced-motion` deaktiviert
  die Einrast-Animation fuer alle Eingabearten.
- Fuer das bisherige Scrubbing-Verhalten `dragMode='sequence'` setzen;
  dort steuert `pixelsPerFrame` wie bisher die Empfindlichkeit.
- Pro Viewer laedt zuerst der aktuelle Frame allein. Danach laden links 1 und
  rechts 1 parallel, dann links 2 und rechts 2 parallel usw. bis zum Ende der
  aktiven Ansicht. Das naechste Paar startet erst, wenn beide Bilder des
  vorherigen Paars mit `load` oder `error` abgeschlossen sind. Es laufen maximal
  zwei Hintergrund-Requests gleichzeitig; bereits geladene Bilder werden uebersprungen,
  ohne Bilder aus unterschiedlichen Abstaenden zu einem neuen Paar zu mischen.
  `loop` bestimmt das Verhalten an den Enden; doppelte URLs werden uebersprungen.
  Neue Konfigurationen verwerfen ausstehende alte Requests. Ein Kamerawechsel
  priorisiert den neu ausgewaehlten Frame; ein Retry pausiert die Hintergrund-Queue.
- Die inaktive Kamerasequenz wird nicht vorgeladen. Nur das Ansichtswechsel-Thumbnail
  wird bei `showThumbnails` zuletzt ueber dieselbe Queue geladen.
  `preloadRadius={0}` deaktiviert
  Hintergrund-Frames; 1-4 begrenzt den Abstand. Slider-Vorschauen starten keine
  eigenen Requests: noch nicht geladene Nachbarn zeigen den Ladehinweis.
- Separate Thumbnail-URLs laufen weiterhin einzeln durch dieselbe Queue, nach den Frame-URLs.
  Bereits geladene identische URLs werden wiederverwendet. Bis dahin erscheinen
  bei erstmaligem Laden nummerierte Kamera-Buttons statt parallel startender Requests.
- Bei Konfigurationswechseln bleiben bereits geladene Bilder und Thumbnails
  sichtbar, mit einem 20-%-Schwarzschleier bis zum fertigen Ersatz. Das gilt
  auch fuer alte Nachbarbilder beim Wischen. Fehler lassen das alte Bild stehen;
  die Fehler-/Retry-Anzeige bleibt bedienbar.
- Geladene Ersatzbilder werden ueber 400 ms weich ueber das bisherige Bild eingeblendet,
  statt es abrupt zu ersetzen. Das alte Bild bleibt waehrend des Crossfades
  darunter erhalten. Erstbilder erscheinen ohne Einblenden aus einer leeren
  Flaeche; normale Kamerawechsel behalten ihre Wischanimation.
  Bei `prefers-reduced-motion` erfolgt der Austausch ohne Crossfade.
- `showThumbnails` mit passender `thumbnailQuality` kombinieren; der Service muss
  die gewaehlte Aufloesung bereitstellen. Browser-Cache und Server-Cache-Header
  bestimmen die Wiederverwendung. Neben der aktuellen Queue wird pro Kamera
  maximal das letzte erfolgreiche Bild behalten, bis sein Ersatz geladen ist.
  Es wird keine unbegrenzte Konfigurationshistorie gespeichert.
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

Ab **0.4.0** erfolgt das Styling ueber Tailwind CSS 4. Den bisherigen
Stylesheet-Import entfernen und das Paket wie oben beschrieben per `@source`
registrieren. Neu sind unter anderem die gemeinsame `cameras`-Auswahl,
4x-Zoom mit gezieltem 4K-Nachladen, `showDebug` und weiche
Konfigurationsuebergaenge.

## Entwicklung und lokale Installation

### Quellcode-Struktur

```text
src/
  index.ts                 Oeffentliche Paket-Exports (Client-Einstieg)
  components/              CigsViewer und interne Bild-/Sequenz-Komponenten
  constants/               Default-Kameras, UI-Beschriftungen und Tailwind-Utilities
  hooks/                   Pointer-/Swipe-Interaktion
  types/                   Gemeinsame TypeScript-Typen und Props
  utils/                   Frame-Navigation, Validierung und Render-Pfade
```

Interne Module importieren einander direkt, nicht ueber den oeffentlichen
Einstieg. `dist/` spiegelt die Modulstruktur und enthaelt nur JavaScript und
TypeScript-Deklarationen. Der Build erzeugt oder kopiert kein CSS.
Alle Utility-Namen stehen vollstaendig im Quellcode, damit Tailwind sie auch
im installierten Paket erkennen kann.

### Startbare Demo ohne npm-Veroeffentlichung

```bash
cd cigs-viewer
npm ci
npm --prefix examples/demo ci
npm run demo
```

Oeffnen: **http://localhost:5173**. Voraussetzung fuer Vite:
Node.js 20.19+ oder 22.12+ (empfohlen: aktuelle Node-LTS-Version).

Die [Demo](./examples/demo/src/main.tsx) verwendet das Paket per
`"cigs-viewer": "file:../.."`, also ohne Registry oder Veroeffentlichung.
`npm run demo` baut die Bibliothek vor dem Start. Nach Aenderungen an der
Bibliothek erneut `npm run build` ausfuehren bzw. die Demo neu starten.
Nach neu hinzugefuegten Tailwind-Klassen in der Bibliothek die Demo neu starten,
damit auch der Entwicklungsserver den Utility-Output neu erzeugt.
Der Vite-Resolver dedupliziert React fuer die lokale Paketverknuepfung.

- Kamera-Checkboxen fuer den gesamten System-Katalog sowie Presets **Alle**,
  **Nur C1** und **Nur C6**. Die bisherige Demo-Auswahl ist initial vorausgewaehlt.
- **Thumbnails anzeigen** ist initial aktiviert; **Mausrad-Zoom aktivieren**
  ist initial deaktiviert. Beide Optionen sind umschaltbar.
- Editierbare Key-Value-Liste, initial mit `B: '01'`, `M: '01'`,
  `P: '070707'` und `PMV: '100'`. Alle Keys und Values lassen sich bearbeiten;
  ueber **+ Paar hinzufuegen** und **Loeschen** laesst sich die Liste erweitern.
- **Konfiguration anwenden** uebernimmt die Liste in Viewer und JSX-Beispiel.
  Unvollstaendige Paare, doppelte Keys und ungueltige Dateinamen-Tokens werden
  sichtbar abgewiesen; die zuvor angewendete Konfiguration bleibt erhalten.
- Links steht ausschliesslich die wiederverwendbare Viewer-Komponente. Das
  JSX-Beispiel darunter enthaelt die aktuelle `cameras`-Liste und Optionen,
  ergaenzt um Einzelkamera-Beispiele.
- Feste Bildquelle **https://cigs.elferplatz.com**, ohne URL-Eingabe oder lokale
  Mock-Bilder. Die Demo benoetigt eine Verbindung zum Render-Service und sendet
  die angewendeten Konfigurationscodes als Bildpfade an diesen Host.
- Die Paket-Filter fuer Exterieur/Interieur bleiben aktiv. Konfigurationen,
  die nach dem Filtern keine Render-Codes enthalten, zeigen einen Fehler;
  der Editor bleibt zum Korrigieren bedienbar. Fehlende Server-Bilder werden
  vom Viewer mit seiner Fehler-/Retry-Anzeige behandelt.

```bash
npm run demo:build
npm --prefix examples/demo test
npm --prefix examples/demo run preview
```

Das Demo-`dist` kann auch statisch bereitgestellt werden; die Bilder kommen
weiterhin ausschliesslich von der festen CIGS-Bildquelle.
Vite kann beim SPA-Build melden, dass es `use client` ignoriert. Das betrifft
nur das Demo-Bundle; die Client-Direktive bleibt im npm-Bibliotheksbuild erhalten.
Dev- und Preview-Server verwenden localhost:5173 und starten bei belegtem Port
nicht auf einem anderen Port. Die Demo ist privat und wird nicht im
npm-Tarball der Bibliothek mitgeliefert.

### Bibliothek pruefen und packen

```bash
git clone git@github.com:wus-digital/cigs-viewer.git
cd cigs-viewer
npm ci
npm run lint
npm test
npm pack --dry-run
npm pack

# In einer separaten React-App:
npm install /absoluter/pfad/cigs-viewer-0.4.0.tgz
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
