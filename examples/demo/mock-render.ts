import type { Connect } from 'vite';
import {
  DEFAULT_EXTERIOR_CAMERAS,
  DEFAULT_INTERIOR_CAMERAS,
} from 'cigs-viewer';

const exterior = new Set(DEFAULT_EXTERIOR_CAMERAS.map(({ id }) => id));
const cameras = new Set([
  ...exterior,
  ...DEFAULT_INTERIOR_CAMERAS.map(({ id }) => id),
]);

export const mockRender: Connect.NextHandleFunction = (
  request,
  response,
  next
) => {
  const path = request.url?.split('?')[0] ?? '';
  if (!path.startsWith('/demo-renders/')) return next();

  const match =
    /^\/demo-renders\/B01_M01_P([0-9A-Fa-f]{6})_PMV(\d{1,3})_C(\d{1,2})_PQM-FHD\.webp$/.exec(
      path
    );
  const camera = Number(match?.[3]);
  const finish = Number(match?.[2]);
  if (!match || !cameras.has(`C${camera}`) || finish > 100) {
    response.statusCode = 404;
    response.end('Unknown demo render. Expected B01, M01, P, PMV and C1-C14.');
    return;
  }

  const color = match[1];
  const isExterior = exterior.has(`C${camera}`);
  const angle = (camera - 7) * 1.5;
  const illustration = isExterior
    ? `<g transform="translate(640 340) rotate(${angle})">
        <ellipse cx="0" cy="80" rx="330" ry="35" fill="#bac5ce"/>
        <path d="M-320 20 L-245-30 L-150-110 L105-110 L210-35 L315 0 L320 60 L-320 60Z" fill="#${color}" stroke="#334155" stroke-width="6"/>
        <path d="M-205-30 L-135-92 L85-92 L170-30Z" fill="#c5e1ec" stroke="#334155" stroke-width="5"/>
        <path d="M-10-90V-32" stroke="#334155" stroke-width="5"/>
        <circle cx="-205" cy="60" r="54" fill="#18212d"/><circle cx="-205" cy="60" r="29" fill="#aab6c4"/>
        <circle cx="200" cy="60" r="54" fill="#18212d"/><circle cx="200" cy="60" r="29" fill="#aab6c4"/>
        <path d="M-270 5H260" stroke="white" stroke-opacity="${finish / 150}" stroke-width="9"/>
      </g>`
    : `<g transform="translate(640 320) rotate(${angle / 2})">
        <rect x="-310" y="-130" width="620" height="265" rx="45" fill="#dce5ec"/>
        <rect x="-280" y="-115" width="560" height="60" rx="22" fill="#334155"/>
        <circle cx="-170" cy="-20" r="55" fill="none" stroke="#18212d" stroke-width="16"/>
        <rect x="-70" y="-90" width="140" height="35" rx="5" fill="#94cddf"/>
        <rect x="-240" y="30" width="170" height="155" rx="35" fill="#${color}" stroke="#334155" stroke-width="6"/>
        <rect x="85" y="30" width="170" height="155" rx="35" fill="#${color}" stroke="#334155" stroke-width="6"/>
        <path d="M-215 60H-95 M110 60H230" stroke="white" stroke-opacity="${finish / 150}" stroke-width="9"/>
      </g>`;

  // The CIGS-shaped .webp URL deliberately returns an SVG illustration in this mock only.
  response.setHeader('Content-Type', 'image/svg+xml');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <rect width="1280" height="720" fill="#eef3f7"/>
    <text x="70" y="95" font-family="sans-serif" font-size="30" fill="#334155">${isExterior ? 'EXTERIEUR' : 'INTERIEUR'} / KAMERA C${camera}</text>
    ${illustration}
    <text x="70" y="620" font-family="monospace" font-size="24" fill="#334155">B01 / M01 / P${color} / PMV${finish}</text>
    <text x="70" y="660" font-family="sans-serif" font-size="20" fill="#475569">Lokales Demo-Bild - kein echtes Fahrzeug-Rendering</text>
  </svg>`);
};
