import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ConfiguratorImageViewer } from '../dist/index.js';
import { adjacentSources, normalizeFrame } from '../dist/frames.js';

const props = {
  exteriorFrames: [{ src: '/exterior.webp' }],
  interiorFrames: [{ src: '/interior.webp' }],
};

test('ESM entry is an SSR-safe client boundary with typed exports and no application dependencies', async () => {
  assert.equal(typeof window, 'undefined');
  const html = renderToString(
    React.createElement(ConfiguratorImageViewer, props)
  );
  assert.match(html, /src="\/exterior.webp"/);
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
    { exteriorFrames: [{ src: '' }] },
  ]) {
    assert.throws(() =>
      renderToString(
        React.createElement(ConfiguratorImageViewer, { ...props, ...options })
      )
    );
  }
  assert.match(
    renderToString(
      React.createElement(ConfiguratorImageViewer, {
        ...props,
        frameIndex: 100,
      })
    ),
    /exterior.webp/
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
