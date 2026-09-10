import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildViewerFrames } from '../dist/utils/render-frames.js';
import { decodeHashedUrl } from './helpers/hashed-url.mjs';

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

test('builds hashed CIGS paths with per-view filters and camera tokens, without sorting configuration', () => {
  const result = buildViewerFrames(options);
  const front = decodeHashedUrl(
    result.exteriorFrames[0].src,
    result.exteriorFrames[0].cameraId
  );
  assert.equal(front.baureihe, 'B01');
  assert.equal(front.cameraId, 'C360_001');
  assert.equal(
    front.configurationCode,
    'B01_M01_P070707_PMV100_AKZ01_PQM-FHD'
  );
  assert.equal(result.exteriorFrames[0].alt, 'Front');
  assert.equal(
    decodeHashedUrl(result.exteriorFrames[0].zoomSrc, 'C360_001')
      .configurationCode,
    'B01_M01_P070707_PMV100_AKZ01_PQM-4K'
  );
  assert.equal(result.exteriorFrames[1].cameraId, 'C360_106');
  assert.equal(
    decodeHashedUrl(result.exteriorFrames[1].src, 'C360_106').configurationCode,
    'B01_M01_P070707_PMV100_AKZ01_PQM-FHD'
  );
  assert.equal(result.interiorFrames[0].cameraId, 'CINT_DASH');
  assert.equal(
    decodeHashedUrl(result.interiorFrames[0].src, 'CINT_DASH')
      .configurationCode,
    'B01_M01_P070707_PMV100_AKZI02_DHC03_PQM-FHD'
  );
  assert.equal(result.interiorFrames[1].cameraId, 'CINT_SEAT');
  assert.equal(
    decodeHashedUrl(result.interiorFrames[1].src, 'CINT_SEAT')
      .configurationCode,
    'B01_M01_P070707_PMV100_AKZI02_DHC03_PQM-FHD'
  );
  for (const frame of [...result.exteriorFrames, ...result.interiorFrames]) {
    assert.ok(frame.src.startsWith('https://renders.example.test/assets/'));
  }
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
    decodeHashedUrl(result.exteriorFrames[0].src, 'C360_001').configurationCode,
    'M01_B01_AKZ02_PQM-FHD'
  );
  assert.equal(
    decodeHashedUrl(result.interiorFrames[0].src, 'CINT_DASH')
      .configurationCode,
    'M01_B01_Z0_AKZ02_PQM-FHD'
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
      const decodedSrc = decodeHashedUrl(frame.src, frame.cameraId);
      assert.ok(decodedSrc.configurationCode.endsWith(`_PQM-${quality}`));
      const zoomQuality =
        quality === 'FHD' || quality === 'WQHD' ? '4K' : quality;
      assert.equal(
        decodeHashedUrl(frame.zoomSrc, frame.cameraId).configurationCode,
        decodedSrc.configurationCode.replace(
          `PQM-${quality}`,
          `PQM-${zoomQuality}`
        )
      );
      assert.equal(
        decodeHashedUrl(frame.thumbnailSrc, frame.cameraId).configurationCode,
        decodedSrc.configurationCode.replace(`PQM-${quality}`, 'PQM-FHD')
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
  assert.equal(result.interiorFrames[0].cameraId, 'C360INT_004');
  assert.match(
    decodeHashedUrl(result.interiorFrames[0].src, 'C360INT_004')
      .configurationCode,
    /_PQM-FHD$/
  );
  assert.equal(result.interiorFrames[1].cameraId, 'CUSTOM-CAMERA');
  assert.match(
    decodeHashedUrl(result.interiorFrames[1].src, 'CUSTOM-CAMERA')
      .configurationCode,
    /_PQM-FHD$/
  );
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
    { baseUrl: '******example.test' },
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
    { baureihe: '../bad' },
    { baureihe: 'x?y' },
    { baureihe: '' },
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

test('baureihe prop overrides configuration.B and is uppercased', () => {
  const result = buildViewerFrames({
    baseUrl: '/renders',
    configuration: { B: '01', M: '01' },
    baureihe: 'bgt3rs',
    cameras: ['C1'],
  });
  const decoded = decodeHashedUrl(result.exteriorFrames[0].src, 'C1');
  assert.equal(decoded.baureihe, 'BGT3RS');
  assert.equal(decoded.configurationCode, 'B01_M01_PQM-FHD');
});

test('missing baureihe and configuration.B throws', () => {
  assert.throws(
    () =>
      buildViewerFrames({
        baseUrl: '/renders',
        configuration: { M: '01' },
      }),
    /baureihe/i
  );
});

test('omitted camera arrays build the exact default cameras in the requested order', () => {
  const defaults = { baseUrl: '/renders', configuration: { B: '01' } };
  const result = buildViewerFrames(defaults);
  const exterior = ['C1', 'C2', 'C3', 'C4', 'C5', 'C8', 'C9', 'C10'];
  const interior = ['C6', 'C7', 'C11', 'C12', 'C13', 'C14'];
  assert.deepEqual(
    result.exteriorFrames.map((frame) => frame.cameraId),
    exterior
  );
  assert.deepEqual(
    result.interiorFrames.map((frame) => frame.cameraId),
    interior
  );
  assert.deepEqual(
    result.exteriorFrames.map(
      (frame) => decodeHashedUrl(frame.src, frame.cameraId).configurationCode
    ),
    exterior.map(() => 'B01_PQM-FHD')
  );
  assert.deepEqual(
    result.interiorFrames.map(
      (frame) => decodeHashedUrl(frame.src, frame.cameraId).configurationCode
    ),
    interior.map(() => 'B01_PQM-FHD')
  );
  for (const frame of [...result.exteriorFrames, ...result.interiorFrames]) {
    assert.ok(frame.src.startsWith('/renders/B01_h1'));
  }
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
  assert.equal(emptyExterior.interiorFrames.length, 6);
  const emptyInterior = buildViewerFrames({ ...defaults, interiorCameras: [] });
  assert.deepEqual(emptyInterior.interiorFrames, []);
  assert.equal(emptyInterior.exteriorFrames.length, 8);
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
    decodeHashedUrl(result.exteriorFrames[0].src, 'C5').configurationCode,
    'B01_AKZ02_PQM-FHD'
  );
  assert.equal(
    decodeHashedUrl(result.interiorFrames[0].zoomSrc, 'C12').configurationCode,
    'B01_AKZI03_PQM-4K'
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
