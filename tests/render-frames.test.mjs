import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildViewerFrames } from '../dist/render-frames.js';

const options = {
  baseUrl: 'https://renders.example.test/assets/',
  configuration: {
    B: 'GT3RS',
    M: '01',
    P: '070707',
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
      src: 'https://renders.example.test/assets/BGT3RS_M01_P070707_AKZ01_C360_001_PQM-FHD.webp',
    },
    {
      cameraId: 'C360_106',
      src: 'https://renders.example.test/assets/BGT3RS_M01_P070707_AKZ01_C360_106_PQM-FHD.webp',
    },
  ]);
  assert.deepEqual(result.interiorFrames, [
    {
      cameraId: 'CINT_DASH',
      src: 'https://renders.example.test/assets/BGT3RS_M01_P070707_AKZI02_DHC03_CINT_DASH_PQM-FHD.webp',
    },
    {
      cameraId: 'CINT_SEAT',
      alt: 'Seats',
      src: 'https://renders.example.test/assets/BGT3RS_M01_P070707_AKZI02_DHC03_CINT_SEAT_PQM-FHD.webp',
    },
  ]);
});

test('preserves code order, skips missing values, retains numeric zero and allows filter overrides', () => {
  const result = buildViewerFrames({
    ...options,
    baseUrl: '/',
    configuration: {
      M: '01',
      B: 'GT3RS',
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
    '/M01_BGT3RS_AKZ02_C360_001_PQM-FHD.webp'
  );
  assert.equal(
    result.interiorFrames[0].src,
    '/M01_BGT3RS_Z0_AKZ02_CINT_DASH_PQM-FHD.webp'
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
  const configuration = Object.freeze({ B: 'GT3RS', M: '01' });
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
    { configuration: { 'B/': 'GT3RS' } },
    { exteriorCameras: undefined },
    { interiorCameras: undefined },
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
