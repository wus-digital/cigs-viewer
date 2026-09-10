# cigs-viewer

Repository: [wus-digital/cigs-viewer](https://github.com/wus-digital/cigs-viewer).

React-/TypeScript-Viewer fuer den CIGS-Render-Service. Der Viewer erhaelt eine
`configuration` als Key-Value-Objekt sowie eine optionale `cameras`-Auswahl und
baut daraus alle Bildpfade selbst. **Keine manuellen Bild-URL-Arrays.**

Ein normaler, durchwischbarer Kamera-Karussell: kein Unreal, Arcware, WebGL
oder Fisheye. React/React DOM bleiben Peer-Dependencies; kleine
Runtime-Helfer (`tailwind-merge` und Radix Slot) uebernehmen Klassen-Overrides
und die Komposition eigener Buttons.

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

Der feste System-Katalog enthaelt diese maximal verfuegbaren Kameras, in
dieser Standard-Reihenfolge:

`C1`, `C2`, `C3`, `C4`, `C5`, `C8`, `C9`, `C10`, `C6`, `C7`, `C11`, `C12`,
`C13`, `C14`

Der Viewer unterscheidet nicht zwischen "Exterieur" und "Interieur" - es gibt
nur eine einzige Kameraliste, in der vom Host konfigurierten (bzw. der
System-Standard-) Reihenfolge. Mit `cameras={['C1', 'C6']}` werden nur diese
IDs, in genau dieser Reihenfolge, verwendet. Unbekannte oder doppelte IDs
werden abgelehnt. Ohne `cameras` wird der komplette Katalog verwendet;
`cameras={[]}` bleibt leer.

```tsx
// Einzelbild, ohne Swipe oder Navigationspfeile:
<CigsViewer baseUrl={baseUrl} configuration={configuration} cameras={['C1']} />
// Nur zwei bestimmte Kameras, in dieser Reihenfolge:
<CigsViewer baseUrl={baseUrl} configuration={configuration} cameras={['C6', 'C1']} />
```

Zoom und Verschieben funktionieren auch beim Einzelbild.

`DEFAULT_CAMERAS` exportiert den unveraenderlichen Katalog als Referenz;
`ViewerCameraId` ist der zugehoerige TypeScript-ID-Typ.

### Wie Bilder geladen werden

Der Viewer baut **keine** Bild-URLs mehr selbst zusammen. Stattdessen ruft er
`POST {baseUrl}/generate` beim CIGS-Render-Service auf und verwendet die von
dort zurueckgelieferten URLs direkt als Bildquelle:

```bash
curl -X POST https://cigs.elferplatz.com/generate \
  -H "Content-Type: application/json" \
  -d '{
    "configuration": { "B": "01", "M": "01", "PQM": "-FHD" },
    "cameras": ["360_001", "360_002"]
  }'
# -> { "360_001": "https://.../C360_001_....webp", "360_002": "https://.../C360_002_....webp" }
```

`baseUrl` ist deshalb die **API-Basis-URL des Render-Service**
(z. B. `http://localhost:3234` lokal oder `https://cigs.elferplatz.com` in
Produktion) und **nicht** eine Bild-CDN-URL — die tatsaechlichen Bild-URLs
liefert ausschliesslich die `/generate`-Antwort, der Viewer rekonstruiert
oder rät sie nie selbst.

Ablauf bei jeder Konfigurations-/Kamera-/Qualitaetsaenderung:

1. Aus `configuration` wird ein Objekt gebaut, ergaenzt um
   `PQM: '-${quality}'`. Der Viewer entscheidet **nicht**, welche
   Konfigurations-Keys gesendet werden - die volle `configuration` geht 1:1
   an `/generate` (leere/`undefined`/`null`-Werte werden uebersprungen, da
   sie keine gueltigen Render-Tokens sind, nicht als bewusste Filterung).
2. Der Viewer ruft `POST {baseUrl}/generate` **nicht** fuer alle Kameras auf
   einmal auf, sondern priorisiert: zuerst nur die aktuell angezeigte (bzw.
   per `cameraId`/`frameIndex` angeforderte, sonst die erste) Kamera, danach
   je ein Aufruf fuer die naechsten Nachbarn (1 links + 1 rechts, dann
   2 links + 2 rechts, usw.) - die Kameraliste wird dabei wie eine
   Ringliste behandelt (identisch zur Wraparound-Navigation), bis alle
   Kameras abgedeckt sind. `cameras` enthaelt dabei die Kamera-IDs **ohne**
   ihr fuehrendes `C` (der Service ergaenzt es selbst). Fuer `zoomSrc` bzw.
   `thumbnailSrc` erfolgt bei abweichender Qualitaet je ein weiterer Aufruf
   pro Batch; identische Qualitaeten teilen sich einen Aufruf.
3. Sobald ein Batch antwortet, werden dessen URLs sofort 1:1 als
   `src`/`zoomSrc`/`thumbnailSrc` fuer genau diese Kameras uebernommen —
   bereits geladene Bilder bleiben dabei unangetastet, unabhaengig davon,
   ob spaetere Batches noch laufen oder fehlschlagen.

Bis eine Kamera ihren ersten Batch erhalten hat, zeigt ihr Frame ein
transparentes 1x1-Platzhalterbild (keine Netzwerklast); Navigation und die
Bildanzahl funktionieren dabei bereits normal, da die Kameraliste selbst
synchron feststeht. Waehrend des allerersten Renderns (auch serverseitig)
zeigt der Viewer kurz den "keine Bilder verfuegbar"-Status (`labels.empty`),
bis der erste Batch eingetroffen ist. Schlaegt ein `/generate`-Aufruf fehl,
bleiben bereits geladene Kameras sichtbar; der Fehler wird ueber
`onGenerateError(error)` gemeldet.

- Die Kamera-ID ist der **vollstaendige Kamera-Token im Konfigurationscode**,
  nicht ein Pfad und nicht ein Alias fuer eine Fisheye-Yaw-/Pitch-Position.
  IDs werden weder umgeschrieben noch automatisch mit `C360`/`C360INT` ergaenzt.
- Die Reihenfolge des `cameras`-Arrays bestimmt die Swipe-Reihenfolge.
- Die `Object.entries(configuration)`-Reihenfolge bleibt wie im bisherigen
  Render-Builder erhalten. Die Keys werden **nicht alphabetisch sortiert**
  und **nicht gefiltert** - was im `configuration`-Objekt steht, geht 1:1
  an den Render-Service.
- `''`, `undefined` und `null` werden ausgelassen; numerische Werte einschliesslich
  `0` werden als Text angehaengt. Fuer fuehrende Nullen Strings wie `'01'` verwenden.
- Qualitaeten: `FHD`, `WQHD`, `4K`, `4KHQ`, `8K`, `8KHQ`; Standard `FHD`.
  Der Render-Service muss die gewaehlte Qualitaet fuer die Kamera anbieten.

Das Paket enthaelt weder Produktbilder noch einen Render-Service.

### Konfiguration aendern

Ein neues `configuration`-Objekt uebergeben, beispielsweise
`{ ...configuration, P: 'FFFFFF' }`. Der Viewer baut aktuelle Bilder,
Nachbar-Preloads und Thumbnails neu auf. Der gemerkte Bildindex bleibt
erhalten; bei kuerzeren Kameralisten wird er begrenzt.
Kameralisten ebenfalls unveraenderlich behandeln und als neue Arrays uebergeben.

### Externe Kamerasteuerung

```tsx
'use client';

import { useState } from 'react';
import {
  CigsViewer,
  DEFAULT_CAMERAS,
  type ViewerRenderOptions,
} from 'cigs-viewer';

export function ControlledPreview(props: ViewerRenderOptions) {
  const [cameraId, setCameraId] = useState(
    () => (props.cameras ?? DEFAULT_CAMERAS.map((camera) => camera.id))[0]
  );

  return (
    <CigsViewer
      {...props}
      cameraId={cameraId}
      onFrameChange={({ frame }) => setCameraId(frame.cameraId)}
    />
  );
}
```

`cameraId` waehlt eine bestimmte Kamera. Mit `onFrameChange` uebernimmt die
Host-App den gewuenschten Wechsel nach Swipe, Tastatur oder Button.
Kontrollierte Props aendern sich erst, wenn der Host sie aktualisiert; die
ID muss in der (ggf. neuen) `cameras`-Auswahl existieren.

Alternativ ist `frameIndex` als nullbasierter kontrollierter Index verfuegbar.
**Nicht gleichzeitig mit `cameraId` verwenden.** Ohne beide Props verwaltet
der Viewer den Index selbst. Bei veraenderlichen Kameralisten muss die
Host-App kontrollierte Kamera-IDs ebenfalls aktualisieren.

## API

| Prop | Default | Bedeutung |
| --- | --- | --- |
| `configuration` | erforderlich | `Readonly<Record<string, string \| number \| null \| undefined>>` |
| `baseUrl` | erforderlich | API-Basis-URL des CIGS-Render-Service fuer `POST /generate`, z. B. `http://localhost:3234` oder `https://cigs.elferplatz.com` (keine Bild-CDN-URL) |
| `cameras` | alle System-Kameras | `readonly ViewerCameraId[]`, z. B. `['C1', 'C6']`; `[]` zeigt den Leerzustand |
| `quality` | `FHD` | CIGS-Qualitaet der dargestellten Bilder und Preloads |
| `thumbnailQuality` | - | Optionale Thumbnail-Qualitaet; ebenfalls per `/generate` aufgeloest |
| `cameraId` | intern | Kontrollierte Kamera-ID |
| `frameIndex` / `defaultFrameIndex` | intern / `0` | Kontrollierter bzw. initialer nullbasierter Index |
| `onFrameChange` | - | `({ frameIndex, frame }) => void`; `frame` enthaelt `cameraId`, `src`, optional `alt`, `thumbnailSrc` |
| `onImageError` | - | `(error, change) => void` fuer das angezeigte Bild |
| `onGenerateError` | - | `(error) => void`, wenn ein `POST /generate`-Aufruf fehlschlaegt |
| `loop` | `true` | Zyklische Navigation |
| `dragMode` | `'slide'` | Echter Bild-Slider; `'sequence'` aktiviert das bisherige kontinuierliche Durchschalten |
| `pixelsPerFrame` | `24` | Positive ganzzahlige Drag-Distanz in CSS-Pixeln, nur fuer `dragMode='sequence'` |
| `preloadRadius` | `'all'` | Gesamte Kameraliste in Nachbarpaaren; alternativ 0-4 Nachbarbilder pro Richtung |
| `showThumbnails` | `false` | Kamera-Thumbnails bei mehreren Kameras; ohne `thumbnailQuality` werden geladene Hauptbilder wiederverwendet |
| `enableZoom` | `false` | Mausrad-Zoom mit gezieltem 4K-Nachladen; Ziehen verschiebt den Ausschnitt |
| `maxZoom` | `4` | Maximale Zoomstufe als Zahl groesser/gleich 1 |
| `labels` | Englisch | Teilmenge von `ViewerLabels`, inklusive Lade-, Fehler-, Retry- und Anleitungstexten |
| `className`, `style` | - | Gestaltung des Containers |
| `classNames` | - | Typisierte Tailwind-Overrides fuer einzelne UI-Bestandteile, siehe unten |
| `children` | Default-Layout | Eigener Aufbau mit den exportierten Viewer-Komponenten |

Callbacks melden Interaktionen, nicht Mount, Konfigurationsaenderungen oder
automatisches Begrenzen von Indizes. Generierte URLs sind **Ausgabedaten** in
Callbacks, keine manuell zu uebergebenden Props. `ViewerFrame` ist ein Ausgabetyp.
Der interne Bild-Renderer ist kein oeffentlicher Package-Export.

Leere Kameralisten zeigen einen Leerzustand. Nach dem Filtern muss mindestens
ein Konfigurationscode uebrig bleiben. Doppelte Kamera-IDs, unbekannte
kontrollierte Kamera-IDs und ungueltige Optionen werfen explizite Fehler fuer
eine Host-Error-Boundary.

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
Der Bildzaehler ist nur noch fuer Screenreader vorhanden.
Die Thumbnail-Leiste legt keinen Verlauf oder Schleier ueber das Hauptbild.
Bei nur einer Kamera wird das Kamera-Thumbnail automatisch ausgeblendet und
nicht separat vorgeladen.

Pfeile, Tastatur und Thumbnails verwenden dieselbe Wisch-/Parallax-Animation
wie Drag-Gesten. Ein Thumbnail-Sprung zeigt direkt die ausgewaehlte
Zielkamera im Hintergrund, ohne Zwischenkameras durchzuschalten. Schnelle
Eingaben schliessen die vorherige Auswahl ab und animieren von dort weiter.
Auswahl-Callbacks werden am Ende der Animation ausgeloest; bei
`prefers-reduced-motion` wird sofort gewechselt. Klick- und Tastaturwechsel
dauern 600 ms mit sanftem Anlauf und anschliessender Beschleunigung. Das
Einrasten nach einem echten Swipe bleibt bei 220 ms.

`enableZoom` aktiviert das Mausrad nur ueber der Bildflaeche, nicht ueber den
Bedienelementen. Gezoomt wird um die Mausposition, zwischen 1x und `maxZoom`.
Ab vergroesserter Darstellung verschiebt Ziehen den Ausschnitt statt Kameras
weiterzuschalten; Pfeile, Thumbnails und Tastatur bleiben bedienbar.
Escape oder "Reset zoom" setzen auf 1x zurueck. Kamera- und
Konfigurationswechsel, Groessenaenderungen oder `enableZoom={false}` setzen
den Zoom ebenfalls zurueck. Ohne Zoom-Prop bleibt normales Seitenscrollen erhalten;
Strg-/Cmd-Mausrad bleibt immer dem Browser vorbehalten.
`labels.resetZoom` und `labels.zoomInstructions` sind lokalisierbar.

Die Demo rendert die Debug-Anzeige bewusst ausserhalb von `CigsViewer` unter der
Bildflaeche. Sie liest die Originalabmessungen (`naturalWidth`/`naturalHeight`)
des sichtbaren Bildes, nicht die CSS-Groesse. Solange ein Ersatzbild oder
hochaufgeloestes Zoom-Bild noch laedt, zeigt sie weiterhin die Daten des
dargestellten Fallback-Bildes. Ohne geladenes Bild stehen Pfad und Aufloesung
auf `-`.

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

## Individuelles Styling und eigene Layouts

### Default-Layout anpassen

Ohne `children` bleibt das bisherige Layout erhalten. Mit `classNames` koennen
einzelne Teile gestaltet werden, ohne Navigation oder Bildlogik selbst zu bauen:

```tsx
import { CigsViewer, type ViewerClassNames } from 'cigs-viewer';

const classNames = {
  previousButton: 'size-12 rounded-full bg-slate-900 enabled:hover:bg-slate-700',
  nextButton: 'size-12 rounded-full bg-slate-900 enabled:hover:bg-slate-700',
  thumbnails: 'gap-3',
  thumbnail: 'rounded-xl aria-pressed:border-sky-500',
  thumbnailImage: 'h-12 w-20 rounded-lg',
} satisfies ViewerClassNames;

<CigsViewer
  baseUrl="https://cigs.elferplatz.com"
  configuration={{ B: '01', M: '01', P: '070707', PMV: '100' }}
  cameras={['C1', 'C2', 'C6']}
  showThumbnails
  classNames={classNames}
/>;
```

Verfuegbare Schluessel: `root`, `viewport`, `navigation`, `previousButton`,
`nextButton`, `zoomResetButton`, `thumbnails`, `thumbnail`, `thumbnailImage`,
`fullscreenButton` und `controlsAgenda`.
`navigation` betrifft nur den Wrapper des Default-Layouts. `thumbnailImage`
gestaltet sowohl das Vorschaubild als auch seinen Platzhalter, damit eigene
Breiten und Hoehen beim Laden stabil bleiben.

Die Reihenfolge lautet **Default-Klassen -> `classNames` -> direktes `className`**.
Bei `asChild` werden explizite Klassen am Child zuletzt zusammengefuehrt.
Tailwind-Konflikte werden mit `tailwind-merge` aufgeloest. Zustands-Varianten
gezielt ueberschreiben, beispielsweise `aria-pressed:border-sky-500` oder
`enabled:hover:bg-slate-700`. Ein normales `bg-white` ersetzt keinen
Hover-Zustand. Beliebige CSS-Properties wie `[padding:1rem]` werden nicht mit
allen entsprechenden Utilities zusammengefuehrt; lieber konsistente Utilities
wie `p-4` verwenden.

### Eigenes Layout mit Children

Die Komponenten teilen sich den internen Viewer-Controller. Pfeile und
Thumbnails verwenden weiterhin dieselben Animationen, Grenzen und Ladezustaende.
Positionen werden im Layout vergeben; die einzelnen Controls haben keine fest
eingebaute Overlay-Position.

```tsx
import {
  CigsViewer,
  CigsViewerViewport,
  CigsViewerPreviousButton,
  CigsViewerNextButton,
  CigsViewerZoomResetButton,
  CigsViewerThumbnails,
} from 'cigs-viewer';

<CigsViewer
  baseUrl="https://cigs.elferplatz.com"
  configuration={{ B: '01', M: '01', P: '070707', PMV: '100' }}
  cameras={['C1', 'C2', 'C6']}
  showThumbnails
  enableZoom
>
  <CigsViewerViewport className="rounded-2xl">
    <CigsViewerPreviousButton className="absolute left-4 top-1/2 -translate-y-1/2" />
    <CigsViewerNextButton className="absolute right-4 top-1/2 -translate-y-1/2" />
    <CigsViewerZoomResetButton className="absolute right-3 top-3" />
  </CigsViewerViewport>
  <CigsViewerThumbnails className="mx-auto my-4 gap-3" />
</CigsViewer>;
```

- `CigsViewerViewport` rendert die geschuetzte Bildflaeche inklusive Swipe,
  Crossfade und Zoom. Seine Children sind eigene Overlays, keine automatisch
  hinzugefuegten Default-Controls.
- `CigsViewerPreviousButton` und `CigsViewerNextButton` navigieren automatisch.
- `CigsViewerZoomResetButton` erscheint nur bei vergroessertem Bild.
- `CigsViewerThumbnails` enthaelt die Kameraauswahl: Bei nur einer Kamera wird
  ihr Thumbnail ausgeblendet; `showThumbnails={false}` unterdrueckt die
  Kamera-Thumbnails.

Die Komponenten muessen innerhalb ihres `CigsViewer` verwendet werden. Auch
Controls ausserhalb der Bildflaeche funktionieren dort ohne eigene Click-Handler.
Pro Viewer ist maximal eine `CigsViewerViewport` gleichzeitig erlaubt.
Fuer ein eigenes Layout diese einbauen und alle gewuenschten
Controls explizit platzieren. Interne Transformations- und Bild-Layer bleiben
Implementierungsdetails.

### Eigene Designsystem-Buttons

Die vier Button-Komponenten unterstuetzen `asChild`. Dabei wird kein weiterer
Button um das Child herum erzeugt; Verhalten und Beschriftung werden weitergegeben:

```tsx
<CigsViewerNextButton asChild>
  <button className="rounded-full bg-slate-900 px-4 text-white">
    Weiter
  </button>
</CigsViewerNextButton>
```

Eigene React-Button-Komponenten muessen eingehende Props und den Ref an ihren
nativen `<button>` weiterreichen (bei React 18 mit `forwardRef`). Ein Link oder
`div` ist kein gleichwertiger Ersatz fuer einen nativen Aktions-Button.
ARIA-Beschriftungen, `type="button"` und die internen Disabled-Zustaende bleiben
erhalten. Eigene Click-Handler werden komponiert; `event.preventDefault()`
kann die Viewer-Aktion bewusst unterbinden.

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
  Kameraliste. Das naechste Paar startet erst, wenn beide Bilder des
  vorherigen Paars mit `load` oder `error` abgeschlossen sind. Es laufen maximal
  zwei Hintergrund-Requests gleichzeitig; bereits geladene Bilder werden uebersprungen,
  ohne Bilder aus unterschiedlichen Abstaenden zu einem neuen Paar zu mischen.
  `loop` bestimmt das Verhalten an den Enden; doppelte URLs werden uebersprungen.
  Neue Konfigurationen verwerfen ausstehende alte Requests. Ein Kamerawechsel
  priorisiert den neu ausgewaehlten Frame; ein Retry pausiert die Hintergrund-Queue.
- `preloadRadius={0}` deaktiviert Hintergrund-Frames; 1-4 begrenzt den Abstand.
  Slider-Vorschauen starten keine eigenen Requests: noch nicht geladene
  Nachbarn zeigen den Ladehinweis.
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
konfigurierbarer Zoom mit gezieltem 4K-Nachladen und weiche
Konfigurationsuebergaenge.

Ab der naechsten Version baut der Viewer Bild-URLs nicht mehr selbst
(weder im Klartext noch gehasht), sondern bezieht sie ausschliesslich ueber
`POST {baseUrl}/generate` vom CIGS-Render-Service (siehe
[Wie Bilder geladen werden](#wie-bilder-geladen-werden)). `baseUrl` muss
daher auf die **API** des Render-Service zeigen (z. B. `http://localhost:3234`
oder `https://cigs.elferplatz.com`), nicht auf eine Bild-CDN-URL. Host-Apps,
die bisher synchron verfuegbare Bildpfade erwartet haben (auch bei
Server-Side Rendering), muessen jetzt auf die asynchrone Aufloesung warten;
die Prop `baureihe` entfaellt ersatzlos.

Ab der naechsten Version entfaellt die Trennung zwischen Exterieur und
Interieur vollstaendig: Der Viewer kennt nur noch **eine** Kameraliste. Die
Props `exteriorCameras`/`interiorCameras`, `viewMode`/`defaultViewMode`/
`onViewModeChange` sowie die Komponente `CigsViewerViewSwitchButton`
entfallen ersatzlos; `cameras` waehlt nun eine einzige, flache Liste aus dem
System-Katalog (`DEFAULT_CAMERAS` statt der bisherigen getrennten
`EXTERIOR_CAMERAS`/`INTERIOR_CAMERAS`/`DEFAULT_EXTERIOR_CAMERAS`/
`DEFAULT_INTERIOR_CAMERAS`).
`ViewerFrameChange`/`onFrameChange` und `onGenerateError` haben kein
`viewMode`-Feld bzw. keinen `viewMode`-Parameter mehr. Host-Apps, die einen
Ansichtswechsel abgebildet haben, muessen diesen entfernen und stattdessen
eine einzige, ggf. gemischte Kameraliste (z. B. `['C1', ..., 'C6', ...]`)
uebergeben. Ausserdem entfaellt `omittedConfigurationKeys` ersatzlos: der
Viewer entscheidet nie, welche Konfigurations-Keys gesendet werden - die
volle `configuration` geht immer 1:1 an `/generate`.

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
- **Darstellung** wechselt zwischen Standard-Layout, Styling-Overrides und eigenem
  Layout mit Thumbnails unter dem Bild und `asChild`-Buttons. Das JSX-Beispiel
  zeigt jeweils die tatsaechlich verwendete API.
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
- Feste API-Basis-URL: `http://localhost:3234` im Dev-Server, `https://cigs.elferplatz.com`
  im Produktions-Build (kein URL-Eingabefeld, keine lokalen Mock-Bilder). Die
  Demo benoetigt eine Verbindung zum Render-Service und ruft darueber
  `POST /generate` mit den angewendeten Konfigurationen und Kameras auf.
- Fehlende Render-Codes nach dem Filtern zeigen einen Fehler; der Editor
  bleibt zum Korrigieren bedienbar. Fehlende Server-Bilder werden vom Viewer
  mit seiner Fehler-/Retry-Anzeige behandelt.

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
