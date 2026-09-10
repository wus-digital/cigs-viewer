import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  viewerExample,
  styledClassNames,
  customNextClasses,
  customPreviousClasses,
  customThumbnailsClasses,
} from '../dist/tests/viewer-example.js';

const options = {
  baseUrl: 'https://cdn.cigs.elferplatz.com',
  configuration: { B: '01', M: '01', P: '070707', PMV: '100' },
  cameras: ['C1', 'C6'],
  enableZoom: false,
  maxZoom: 4,
  quality: 'FHD',
  showThumbnails: true,
};

test('default example preserves configuration, selected cameras and optional flags', () => {
  const source = viewerExample({ ...options, layout: 'default' });
  assert.match(source, /cameras=\{\["C1","C6"\]\}/);
  assert.match(source, /quality="FHD"/);
  assert.match(source, /"P": "070707"/);
  assert.match(source, /"PMV": "100"/);
  assert.match(source, /maxZoom=\{4\}/);
  assert.doesNotMatch(
    source,
    /classNames=|CigsViewerViewport|enableZoom|styles\.css/
  );
  const changed = viewerExample({
    ...options,
    layout: 'default',
    showThumbnails: false,
    enableZoom: true,
  });
  assert.match(changed, /showThumbnails=\{false\}/);
  assert.match(changed, /enableZoom/);
  assert.match(changed, /maxZoom=\{4\}/);
});

test('styled example includes the exact shared slot overrides used by the demo', () => {
  const source = viewerExample({ ...options, layout: 'styled' });
  assert.match(source, /classNames=/);
  for (const value of Object.values(styledClassNames)) {
    assert.ok(source.includes(value));
  }
  assert.doesNotMatch(source, /CigsViewerViewport/);
});

test('custom example puts thumbnails below viewport and composes buttons without manual handlers', () => {
  const source = viewerExample({ ...options, layout: 'custom' });
  assert.ok(source.includes('CigsViewerPreviousButton asChild'));
  assert.ok(source.includes('CigsViewerNextButton asChild'));
  for (const value of [
    customNextClasses,
    customPreviousClasses,
    customThumbnailsClasses,
  ]) {
    assert.ok(source.includes(value));
  }
  assert.ok(
    source.indexOf('<CigsViewerThumbnails') >
      source.indexOf('</CigsViewerViewport>')
  );
  assert.match(source, /<CigsViewerZoomResetButton/);
  assert.doesNotMatch(source, /onClick=|onFrameChange=|styles\.css/);
});
