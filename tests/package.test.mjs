import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CigsViewer } from 'cigs-viewer';
import { adjacentSources, normalizeFrame } from '../dist/frames.js';

test('exports CigsViewer and ships only the renamed component module', async () => {
  const api = await import('cigs-viewer');
  assert.equal(typeof api.CigsViewer, 'function');
  assert.equal('ConfiguratorImageViewer' in api, false);
  assert.equal('CigsViwer' in api, false);
  const files = await readdir(new URL('../dist/', import.meta.url));
  assert.ok(files.includes('CigsViewer.js'));
  assert.ok(files.includes('CigsViewer.d.ts'));
  assert.ok(
    !files.some((file) => /^(ConfiguratorImageViewer|CigsViwer)\./.test(file))
  );
});

const props = {
  baseUrl: '/renders',
  configuration: { B: '01', M: '01' },
  exteriorCameras: [{ id: 'C360_001' }],
  interiorCameras: [{ id: 'CINT_DASH' }],
};

test('ESM entry is an SSR-safe client boundary with typed exports and no application dependencies', async () => {
  assert.equal(typeof window, 'undefined');
  const html = renderToString(React.createElement(CigsViewer, props));
  assert.match(html, /src="\/renders\/B01_M01_C360_001_PQM-FHD.webp"/);
  assert.doesNotMatch(html, /canvas|iframe|video/);
  const entry = await readFile(
    new URL('../dist/index.js', import.meta.url),
    'utf8'
  );
  assert.match(entry, /^['"]use client['"];/);
  const manifest = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.equal(manifest.dependencies, undefined);
  assert.deepEqual(Object.keys(manifest.peerDependencies), [
    'react',
    'react-dom',
  ]);
  for (const name of await readdir(new URL('../dist/', import.meta.url))) {
    if (!name.endsWith('.js')) continue;
    const code = await readFile(
      new URL(`../dist/${name}`, import.meta.url),
      'utf8'
    );
    assert.doesNotMatch(
      code,
      /(?:from|import)\s*['"](?:next|@\/|three|zustand|react-pannellum|@arcware|@epicgames)/
    );
  }
});

test('invalid options fail explicitly, while out-of-range indices are safely clamped', () => {
  for (const options of [
    { preloadRadius: -1 },
    { preloadRadius: 5 },
    { pixelsPerFrame: 0 },
    { frameIndex: NaN },
    { frameIndex: -1 },
    { defaultFrameIndex: 0.2 },
    { viewMode: 'panorama' },
    { exteriorCameras: [{ id: '' }] },
    { cameraId: 'unknown' },
    { cameraId: 'C360_001', frameIndex: 0 },
    { baseUrl: '' },
    { configuration: {} },
  ]) {
    assert.throws(() =>
      renderToString(React.createElement(CigsViewer, { ...props, ...options }))
    );
  }
  assert.match(
    renderToString(
      React.createElement(CigsViewer, {
        ...props,
        frameIndex: 100,
      })
    ),
    /B01_M01_C360_001_PQM-FHD.webp/
  );
});

test('frame math handles wraparound, empty data and bounded preloading', () => {
  assert.equal(normalizeFrame(-121, 120, true), 119);
  assert.equal(normalizeFrame(241, 120, true), 1);
  assert.equal(normalizeFrame(5, 0, true), 0);
  assert.equal(normalizeFrame(5, 2, false), 1);
  assert.deepEqual(adjacentSources([], 0, 4, true), []);
  assert.deepEqual(
    adjacentSources([{ src: 'a' }, { src: 'a' }], 0, 4, true),
    []
  );
  assert.deepEqual(
    adjacentSources([{ src: 'a' }, { src: 'b' }, { src: 'c' }], 0, 1, false),
    ['b']
  );
});
