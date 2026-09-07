import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { test } from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  CigsViewer,
  CigsViewerViewport,
  CigsViewerNextButton,
} from 'cigs-viewer';
import { adjacentSourceBatches, normalizeFrame } from '../dist/utils/frames.js';

test('exports CigsViewer and ships only the renamed component module', async () => {
  const api = await import('cigs-viewer');
  assert.equal(typeof api.CigsViewer, 'function');
  assert.equal('ConfiguratorImageViewer' in api, false);
  assert.equal('CigsViwer' in api, false);
  assert.equal('useViewerContext' in api, false);
  assert.equal('useViewerController' in api, false);
  const root = new URL('../dist/', import.meta.url);
  assert.deepEqual((await readdir(root)).sort(), [
    'components',
    'constants',
    'hooks',
    'index.d.ts',
    'index.js',
    'types',
    'utils',
  ]);
  const files = await readdir(root, { recursive: true });
  assert.ok(files.includes(join('components', 'CigsViewer.js')));
  assert.ok(files.includes(join('components', 'CigsViewer.d.ts')));
  assert.ok(
    !files.some((file) =>
      /^(ConfiguratorImageViewer|CigsViwer)\./.test(basename(file))
    )
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
  assert.doesNotMatch(html, /<(?:canvas|iframe|video)\b/);
  const custom = renderToString(
    React.createElement(
      CigsViewer,
      {
        ...props,
        exteriorCameras: [{ id: 'C1' }, { id: 'C2' }],
      },
      React.createElement(CigsViewerViewport),
      React.createElement(CigsViewerNextButton)
    )
  );
  assert.match(custom, /aria-live="polite"/);
  assert.match(custom, /aria-label="Next image"/);
  assert.doesNotMatch(custom, /civ__navigation/);
  const entry = await readFile(
    new URL('../dist/index.js', import.meta.url),
    'utf8'
  );
  assert.match(entry, /^['"]use client['"];/);
  const manifest = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), [
    '@radix-ui/react-slot',
    'tailwind-merge',
  ]);
  assert.deepEqual(Object.keys(manifest.peerDependencies), [
    'react',
    'react-dom',
  ]);
  for (const name of await readdir(new URL('../dist/', import.meta.url), {
    recursive: true,
  })) {
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

test('package uses scannable Tailwind utilities without shipping a stylesheet', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.equal(manifest.exports['./styles.css'], undefined);
  assert.equal(manifest.sideEffects, false);
  const files = await readdir(new URL('../dist/', import.meta.url), {
    recursive: true,
  });
  assert.ok(!files.some((file) => file.endsWith('.css')));
  const utilities = await readFile(
    new URL('../dist/constants/tailwind.js', import.meta.url),
    'utf8'
  );
  assert.match(utilities, /object-contain/);
  assert.match(utilities, /focus-visible:outline/);
  const html = renderToString(
    React.createElement(CigsViewer, { ...props, showThumbnails: true })
  );
  assert.match(html, /aspect-\[var\(--civ-aspect-ratio\)\]/);
  assert.doesNotMatch(html, /after:|bg-gradient|bg-linear/);
});

test('invalid options fail explicitly, while out-of-range indices are safely clamped', () => {
  for (const options of [
    { preloadRadius: -1 },
    { preloadRadius: 5 },
    { pixelsPerFrame: 0 },
    { dragMode: 'panorama' },
    { enableZoom: 'true' },
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
  assert.deepEqual(adjacentSourceBatches([], 0, 4, true), []);
  assert.deepEqual(
    adjacentSourceBatches([{ src: 'a' }, { src: 'a' }], 0, 4, true),
    []
  );
  assert.deepEqual(
    adjacentSourceBatches(
      [{ src: 'a' }, { src: 'b' }, { src: 'c' }],
      0,
      1,
      false
    ),
    [['b']]
  );
});
