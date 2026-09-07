import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildViewerFrames } from '../dist/utils/render-frames.js';

const options = {
  baseUrl: 'https://renders.example.test/assets/',
  configuration: {
    B: '01',
    M: '01',
    P: '070707',
    PMV: '100',
    AKZ: '01',
    AKZI: '02',
    DHC: '03',
  },
  exteriorCameras: [{ id: 'C360_001', label: 'Front' }, { id: 'C360_106' }],
  interiorCameras: [{ id: 'CINT_DASH' }, { id: 'CINT_SEAT', label: 'Seats' }],
};

test('builds exact CIGS paths with per-view filters and camera tokens, without sorting configuration', () => {
  const result = buildViewerFrames(options);
  assert.deepEqual(result.exteriorFrames, [
    {
      cameraId: 'C360_001',
      alt: 'Front',
      src: 'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZ01_C360_001_PQM-FHD.webp',
      zoomSrc:
        'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZ01_C360_001_PQM-4K.webp',
    },
    {
      cameraId: 'C360_106',
      src: 'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZ01_C360_106_PQM-FHD.webp',
      zoomSrc:
        'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZ01_C360_106_PQM-4K.webp',
    },
  ]);
  assert.deepEqual(result.interiorFrames, [
    {
      cameraId: 'CINT_DASH',
      src: 'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZI02_DHC03_CINT_DASH_PQM-FHD.webp',
      zoomSrc:
        'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZI02_DHC03_CINT_DASH_PQM-4K.webp',
    },
    {
      cameraId: 'CINT_SEAT',
      alt: 'Seats',
      src: 'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZI02_DHC03_CINT_SEAT_PQM-FHD.webp',
      zoomSrc:
        'https://renders.example.test/assets/B01_M01_P070707_PMV100_AKZI02_DHC03_CINT_SEAT_PQM-4K.webp',
    },
  ]);
});

test('preserves code order, skips missing values, retains numeric zero and allows filter overrides', () => {
  const result = buildViewerFrames({
    ...options,
    baseUrl: '/',
    configuration: {
      M: '01',
      B: '01',
      EMPTY: '',
      UNDEFINED: undefined,
      NULL: null,
      Z: 0,
      AKZ: '02',
    },
    omittedConfigurationKeys: { exterior: ['Z'], interior: [] },
  });
  assert.equal(
    result.exteriorFrames[0].src,
    '/M01_B01_AKZ02_C360_001_PQM-FHD.webp'
  );
  assert.equal(
    result.interiorFrames[0].src,
    '/M01_B01_Z0_AKZ02_CINT_DASH_PQM-FHD.webp'
  );
});

test('all supported qualities and thumbnail paths use the same configuration and camera', () => {
  for (const quality of ['FHD', 'WQHD', '4K', '4KHQ', '8K', '8KHQ']) {
    const result = buildViewerFrames({
      ...options,
      quality,
      thumbnailQuality: 'FHD',
    });
    for (const frame of [...result.exteriorFrames, ...result.interiorFrames]) {
      assert.ok(frame.src.endsWith(`_${frame.cameraId}_PQM-${quality}.webp`));
      assert.equal(
        frame.zoomSrc,
        quality === 'FHD' || quality === 'WQHD'
          ? frame.src.replace(`PQM-${quality}.webp`, 'PQM-4K.webp')
          : frame.src
      );
      assert.equal(
        frame.thumbnailSrc,
        frame.src.replace(`PQM-${quality}.webp`, 'PQM-FHD.webp')
      );
    }
  }
});

test('camera IDs are explicit and are not rewritten into panorama or invented sequence names', () => {
  const result = buildViewerFrames({
    ...options,
    interiorCameras: [{ id: 'C360INT_004' }, { id: 'CUSTOM-CAMERA' }],
    exteriorCameras: [],
  });
  assert.deepEqual(result.exteriorFrames, []);
  assert.match(result.interiorFrames[0].src, /_C360INT_004_PQM-FHD.webp$/);
  assert.match(result.interiorFrames[1].src, /_CUSTOM-CAMERA_PQM-FHD.webp$/);
});

test('does not mutate configuration, camera lists or options', () => {
  const configuration = Object.freeze({ B: '01', M: '01' });
  const cameras = Object.freeze([Object.freeze({ id: 'C360_001' })]);
  const frozen = Object.freeze({
    ...options,
    configuration,
    exteriorCameras: cameras,
    interiorCameras: cameras,
  });
  const first = buildViewerFrames(frozen);
  const second = buildViewerFrames(frozen);
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(configuration), ['B', 'M']);
});

test('rejects malformed configuration, duplicate cameras, unsafe URL tokens and invalid options', () => {
  for (const invalid of [
    { baseUrl: '' },
    { baseUrl: 'renders' },
    { baseUrl: '//example.test' },
    { baseUrl: 'https://user:secret@example.test' },
    { baseUrl: '/renders?x=1' },
    { baseUrl: 'javascript:alert(1)' },
    { baseUrl: '/renders#hash' },
    { baseUrl: 'https://example.test\\evil' },
    { configuration: undefined },
    { configuration: [] },
    { configuration: new Date() },
    { configuration: {} },
    { configuration: { B: false } },
    { configuration: { B: NaN } },
    { configuration: { B: '../bad' } },
    { configuration: { B: 'x?y' } },
    { configuration: { B: 'x#y' } },
    { configuration: { 'B/': '01' } },
    { exteriorCameras: null },
    { interiorCameras: null },
    { exteriorCameras: [{ id: 'C1' }, { id: 'C1' }] },
    { interiorCameras: [{ id: '' }] },
    { interiorCameras: [{ id: '../bad' }] },
    { interiorCameras: [null] },
    { quality: 'unknown' },
    { thumbnailQuality: 'small' },
    { omittedConfigurationKeys: { exterior: 'B' } },
  ]) {
    assert.throws(
      () => buildViewerFrames({ ...options, ...invalid }),
      undefined,
      JSON.stringify(invalid)
    );
  }
});

test('omitted camera arrays build the exact default cameras in the requested order', () => {
  const defaults = { baseUrl: '/renders', configuration: { B: '01' } };
  const result = buildViewerFrames(defaults);
  const exterior = ['C1', 'C2', 'C3', 'C4', 'C5', 'C9', 'C10'];
  const interior = ['C6', 'C7', 'C8', 'C11', 'C12', 'C13', 'C14'];
  assert.deepEqual(
    result.exteriorFrames.map((frame) => frame.cameraId),
    exterior
  );
  assert.deepEqual(
    result.interiorFrames.map((frame) => frame.cameraId),
    interior
  );
  assert.deepEqual(
    result.exteriorFrames.map((frame) => frame.src),
    exterior.map((id) => `/renders/B01_${id}_PQM-FHD.webp`)
  );
  assert.deepEqual(
    result.interiorFrames.map((frame) => frame.src),
    interior.map((id) => `/renders/B01_${id}_PQM-FHD.webp`)
  );
  assert.deepEqual(
    buildViewerFrames({
      ...defaults,
      exteriorCameras: undefined,
      interiorCameras: undefined,
    }),
    result
  );
});

test('camera overrides are independent and empty arrays do not fall back to defaults', () => {
  const defaults = { baseUrl: '/renders', configuration: { B: '01' } };
  const result = buildViewerFrames({
    ...defaults,
    exteriorCameras: [{ id: 'CUSTOM' }],
  });
  assert.equal(result.exteriorFrames[0].cameraId, 'CUSTOM');
  assert.equal(result.interiorFrames[0].cameraId, 'C6');
  const emptyExterior = buildViewerFrames({ ...defaults, exteriorCameras: [] });
  assert.deepEqual(emptyExterior.exteriorFrames, []);
  assert.equal(emptyExterior.interiorFrames.length, 7);
  const emptyInterior = buildViewerFrames({ ...defaults, interiorCameras: [] });
  assert.deepEqual(emptyInterior.interiorFrames, []);
  assert.equal(emptyInterior.exteriorFrames.length, 7);
});

test('cameras selects and classifies only known IDs, preserving input order per view', () => {
  const selection = Object.freeze(['C12', 'C5', 'C6', 'C1']);
  const result = buildViewerFrames({
    baseUrl: '/renders',
    configuration: { B: '01', AKZ: '02', AKZI: '03' },
    cameras: selection,
  });
  assert.deepEqual(
    result.exteriorFrames.map(({ cameraId }) => cameraId),
    ['C5', 'C1']
  );
  assert.deepEqual(
    result.interiorFrames.map(({ cameraId }) => cameraId),
    ['C12', 'C6']
  );
  assert.equal(
    result.exteriorFrames[0].src,
    '/renders/B01_AKZ02_C5_PQM-FHD.webp'
  );
  assert.equal(
    result.interiorFrames[0].zoomSrc,
    '/renders/B01_AKZI03_C12_PQM-4K.webp'
  );
  assert.deepEqual(selection, ['C12', 'C5', 'C6', 'C1']);
});

test('single-camera, single-view and empty selections never fill in omitted cameras', () => {
  const base = { baseUrl: '/renders', configuration: { B: '01' } };
  const exterior = buildViewerFrames({ ...base, cameras: ['C1'] });
  assert.equal(exterior.exteriorFrames.length, 1);
  assert.deepEqual(exterior.interiorFrames, []);
  const interior = buildViewerFrames({ ...base, cameras: ['C6'] });
  assert.equal(interior.interiorFrames.length, 1);
  assert.deepEqual(interior.exteriorFrames, []);
  assert.deepEqual(buildViewerFrames({ ...base, cameras: [] }), {
    exteriorFrames: [],
    interiorFrames: [],
  });
});

test('invalid or ambiguous common camera selections fail explicitly', () => {
  const base = { baseUrl: '/renders', configuration: { B: '01' } };
  for (const cameras of [
    null,
    'C1',
    [null],
    [1],
    [{ id: 'C1' }],
    ['C99'],
    ['C1', 'C1'],
  ]) {
    assert.throws(() => buildViewerFrames({ ...base, cameras }));
  }
  assert.throws(
    () => buildViewerFrames({ ...base, cameras: ['C1'], exteriorCameras: [] }),
    /not both/
  );
  assert.throws(
    () => buildViewerFrames({ ...base, cameras: ['C6'], interiorCameras: [] }),
    /not both/
  );
});
