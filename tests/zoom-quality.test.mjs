import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ImageFrameViewer } from '../dist/components/ImageFrameViewer.js';

const { act } = React;
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const preloads = [];
globalThis.Image = class {
  set src(src) {
    this.url = src;
    preloads.push(this);
  }
  removeAttribute() {
    this.cancelled = true;
  }
};

function frames(prefix, count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    cameraId: `${prefix}-${index}`,
    src: `/${prefix}/base-${index}.webp`,
    zoomSrc: `/sharp/${prefix}/PQM-4K-${index}.webp`,
    thumbnailSrc: `/${prefix}/thumb-${index}.webp`,
  }));
}
const exteriorFrames = frames('exterior');
const interiorFrames = frames('interior', 2);
const defaults = {
  exteriorFrames,
  interiorFrames,
  enableZoom: true,
  preloadRadius: 0,
};
let root;
let container;

afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = undefined;
  document.body.replaceChildren();
  preloads.length = 0;
});

async function render(props = {}, strict = false) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  const viewer = React.createElement(ImageFrameViewer, {
    ...defaults,
    ...props,
  });
  await act(async () =>
    root.render(
      strict ? React.createElement(React.StrictMode, null, viewer) : viewer
    )
  );
  for (const element of container.querySelectorAll(
    '.civ__stage, .civ__canvas'
  )) {
    element.getBoundingClientRect = () => ({
      width: 500,
      height: 300,
      left: 0,
      top: 0,
    });
  }
}
const baseImage = () => container.querySelector('.civ__track .civ__image');
const sharpImage = () => container.querySelector('.civ__zoom-quality img');
const zoomScale = () => {
  const match = container
    .querySelector('.civ__zoom-layer')
    .style.transform.match(/scale\(([^)]+)\)/);
  return match ? Number(match[1]) : 1;
};
const button = (label) =>
  [...container.querySelectorAll('button')].find(
    (item) =>
      item.textContent === label || item.getAttribute('aria-label') === label
  );
async function fire(image, type) {
  await act(async () => {
    image.dispatchEvent(new dom.window.Event(type));
  });
}
async function wheel(deltaY = -150) {
  await act(async () =>
    container.querySelector('.civ__canvas').dispatchEvent(
      new dom.window.WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 250,
        clientY: 150,
        deltaY,
      })
    )
  );
}
async function resetZoom() {
  await act(async () =>
    container.querySelector('.civ__stage').dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      })
    )
  );
}
function assertBaseVisible(image = baseImage()) {
  assert.equal(image.isConnected, true);
  assert.equal(image.style.visibility, 'visible');
  assert.equal(image, baseImage());
}
function assertOnlySelectedSharp(src) {
  const sharpSources = [
    ...[...container.querySelectorAll('img')].map((image) =>
      image.getAttribute('src')
    ),
    ...preloads.map((image) => image.url),
  ].filter((value) => value?.includes('/sharp/'));
  assert.deepEqual(sharpSources, [src]);
}

async function loadWithSize(image, width, height) {
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: height },
  });
  await fire(image, 'load');
}
test('maxZoom limits wheel zoom and resets when the limit changes', async () => {
  await render({ maxZoom: 2 });
  await loadWithSize(baseImage(), 1920, 1080);
  for (let index = 0; index < 12; index += 1) await wheel(-200);
  assert.equal(zoomScale(), 2);
  await render({ maxZoom: 3 });
  assert.equal(zoomScale(), 1);
  for (let index = 0; index < 12; index += 1) await wheel(-200);
  assert.equal(zoomScale(), 3);
});

test('zoom waits for the selected base and requests only its explicit 4K URL', async () => {
  await render({ frameIndex: 2, preloadRadius: 'all', showThumbnails: true });
  const base = baseImage();
  await wheel();
  assert.equal(sharpImage(), null);
  assert.equal(preloads.length, 0);
  await fire(base, 'load');
  const sharp = sharpImage();
  assert.equal(sharp.getAttribute('src'), exteriorFrames[2].zoomSrc);
  assert.equal(sharp.style.visibility, 'hidden');
  assertBaseVisible(base);
  assertOnlySelectedSharp(exteriorFrames[2].zoomSrc);
  assert.deepEqual(
    preloads.map(({ url }) => url),
    [exteriorFrames[1].src, exteriorFrames[3].src]
  );
  await wheel();
  await wheel();
  assert.equal(sharpImage(), sharp);
  assertOnlySelectedSharp(exteriorFrames[2].zoomSrc);
});

test('successful sharp foreground replaces visually without replacing the base DOM', async () => {
  await render();
  const base = baseImage();
  await fire(base, 'load');
  await wheel();
  const sharp = sharpImage();
  await fire(sharp, 'load');
  assert.equal(sharp.style.visibility, 'visible');
  assertBaseVisible(base);
  assert.equal(
    container.querySelector('.civ__zoom-quality [role=status]'),
    null
  );
  await wheel();
  assert.equal(sharpImage(), sharp);
  await resetZoom();
  assert.equal(sharp.closest('.civ__zoom-quality').hidden, true);
  assert.equal(sharp.getAttribute('src'), exteriorFrames[0].zoomSrc);
  await wheel();
  assert.equal(sharpImage(), sharp);
  assert.equal(sharp.closest('.civ__zoom-quality').hidden, false);
  assert.equal(sharp.style.visibility, 'visible');
});

test('failed upgrade keeps the base, reports actual URL, and retries only that upgrade', async () => {
  const errors = [];
  await render({
    preloadRadius: 'all',
    onImageError: (error, change) => errors.push({ error, change }),
  });
  const base = baseImage();
  await fire(base, 'load');
  const pair = [...preloads];
  await wheel();
  const failed = sharpImage();
  await fire(failed, 'error');
  assertBaseVisible(base);
  assert.equal(failed.style.visibility, 'hidden');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].change.frame.src, exteriorFrames[0].zoomSrc);
  assert.equal(errors[0].change.frame.cameraId, exteriorFrames[0].cameraId);
  assert.equal(errors[0].change.frameIndex, 0);
  assert.equal(errors[0].change.viewMode, 'exterior');
  assert.match(errors[0].error.message, /PQM-4K/);
  assert.ok(container.querySelector('.civ__zoom-quality [role=alert]'));
  await wheel();
  assert.equal(sharpImage(), failed);
  await act(() => button('Retry').click());
  const retry = sharpImage();
  assert.notEqual(retry, failed);
  assert.equal(failed.getAttribute('src'), null);
  assert.equal(retry.getAttribute('src'), exteriorFrames[0].zoomSrc);
  assert.equal(retry.style.visibility, 'hidden');
  assertBaseVisible(base);
  assert.equal(preloads.length, 2);
  assert.ok(pair.every((image) => !image.cancelled));
  await fire(failed, 'load');
  assert.equal(retry.style.visibility, 'hidden');
  await fire(retry, 'load');
  assert.equal(retry.style.visibility, 'visible');
  assert.equal(container.querySelector('[role=alert]'), null);
  assert.equal(errors.length, 1);
  assert.equal(preloads.length, 2);
  await act(() => pair[0].onload());
  assert.equal(preloads.length, 2);
  await act(() => pair[1].onload());
  assert.equal(preloads.length, 4);
  assert.ok(preloads.every(({ url }) => !url.includes('/sharp/')));
});

test('zoom out cancels a pending upgrade and ignores its late events', async () => {
  const errors = [];
  await render({ onImageError: (...args) => errors.push(args) });
  await fire(baseImage(), 'load');
  await wheel();
  const stale = sharpImage();
  await resetZoom();
  assert.equal(sharpImage(), null);
  assert.equal(stale.getAttribute('src'), null);
  await wheel();
  const current = sharpImage();
  assert.notEqual(current, stale);
  await fire(stale, 'load');
  await fire(stale, 'error');
  assert.equal(current.style.visibility, 'hidden');
  assert.deepEqual(errors, []);
  await fire(current, 'load');
  assert.equal(current.style.visibility, 'visible');
});

test('controlled camera change cancels stale upgrade and needs a fresh zoom', async () => {
  const errors = [];
  const props = { onImageError: (...args) => errors.push(args) };
  await render({ ...props, frameIndex: 0 });
  await fire(baseImage(), 'load');
  await wheel();
  const stale = sharpImage();
  await render({ ...props, frameIndex: 1 });
  assert.equal(sharpImage(), null);
  assert.equal(stale.getAttribute('src'), null);
  await fire(baseImage(), 'load');
  await wheel();
  assertOnlySelectedSharp(exteriorFrames[1].zoomSrc);
  await fire(stale, 'load');
  await fire(stale, 'error');
  assert.deepEqual(errors, []);
  assert.equal(sharpImage().style.visibility, 'hidden');
});

test('configuration changes preserve the old base veil but discard sharp foreground', async () => {
  await render();
  const oldBase = baseImage();
  await fire(oldBase, 'load');
  await wheel();
  const stale = sharpImage();
  const updated = exteriorFrames.map((frame) => ({
    ...frame,
    src: frame.src.replace('/exterior/', '/updated/'),
    zoomSrc: `/sharp/updated/${frame.cameraId}.webp`,
  }));
  await render({ exteriorFrames: updated });
  assert.equal(sharpImage(), null);
  assert.equal(stale.getAttribute('src'), null);
  assert.equal(oldBase.isConnected, true);
  assert.equal(oldBase.style.visibility, 'visible');
  assert.ok(container.querySelector('.civ__loading-veil'));
  await wheel();
  assert.equal(sharpImage(), null);
  await fire(baseImage(), 'load');
  assertOnlySelectedSharp(updated[0].zoomSrc);
  await fire(stale, 'load');
  assert.equal(sharpImage().style.visibility, 'hidden');
});

test('quality-source-only changes reset zoom and never show the stale source', async () => {
  await render();
  await fire(baseImage(), 'load');
  await wheel();
  const old = sharpImage();
  await fire(old, 'load');
  const updated = exteriorFrames.map((frame) => ({
    ...frame,
    zoomSrc: `${frame.zoomSrc}?revision=2`,
  }));
  await render({ exteriorFrames: updated });
  assert.equal(sharpImage(), null);
  assert.equal(old.getAttribute('src'), null);
  await wheel();
  assertOnlySelectedSharp(updated[0].zoomSrc);
  assert.equal(sharpImage().style.visibility, 'hidden');
});

test('disabled zoom and missing or identical zoom sources never request upgrades', async () => {
  for (const props of [
    { enableZoom: false },
    {
      exteriorFrames: exteriorFrames.map(({ src, cameraId, thumbnailSrc }) => ({
        src,
        cameraId,
        thumbnailSrc,
      })),
    },
    {
      exteriorFrames: exteriorFrames.map((frame) => ({
        ...frame,
        zoomSrc: frame.src,
      })),
    },
  ]) {
    await render(props);
    await fire(baseImage(), 'load');
    await wheel();
    assert.equal(sharpImage(), null);
    assert.ok(preloads.every(({ url }) => !url.includes('/sharp/')));
  }
});

test('preparing navigation cancels outgoing sharp request and blocks wheel upgrades', async () => {
  await render({ preloadRadius: 'all' });
  await fire(baseImage(), 'load');
  await wheel();
  const outgoing = sharpImage();
  await act(() => button('Next image').click());
  assert.equal(sharpImage(), null);
  assert.equal(outgoing.getAttribute('src'), null);
  await wheel();
  assert.equal(sharpImage(), null);
  assert.ok(preloads.every(({ url }) => !url.includes('/sharp/')));
});

test('disabling zoom or unmounting cancels pending foreground requests', async () => {
  const errors = [];
  const props = { onImageError: (...args) => errors.push(args) };
  await render(props);
  await fire(baseImage(), 'load');
  await wheel();
  const disabled = sharpImage();
  await render({ ...props, enableZoom: false });
  assert.equal(sharpImage(), null);
  assert.equal(disabled.getAttribute('src'), null);
  await render(props);
  await wheel();
  const unmounted = sharpImage();
  await act(() => root.unmount());
  root = undefined;
  assert.equal(unmounted.getAttribute('src'), null);
  await fire(disabled, 'error');
  await fire(unmounted, 'error');
  assert.deepEqual(errors, []);
});

test('StrictMode foreground requests remain usable through effect and ref replay', async () => {
  await render({}, true);
  await fire(baseImage(), 'load');
  await wheel();
  const sharp = sharpImage();
  assert.equal(sharp.getAttribute('src'), exteriorFrames[0].zoomSrc);
  await fire(sharp, 'load');
  assert.equal(sharp.style.visibility, 'visible');
  await wheel();
  assert.equal(sharpImage(), sharp);
});

test('single-camera sequence stays static at 1x but allows zoom and pan', async () => {
  await render({
    exteriorFrames: exteriorFrames.slice(0, 1),
    interiorFrames: [],
    dragMode: 'sequence',
  });
  const stage = container.querySelector('.civ__stage');
  let captured = false;
  stage.setPointerCapture = () => {
    captured = true;
  };
  stage.hasPointerCapture = () => captured;
  stage.releasePointerCapture = () => {
    captured = false;
  };
  async function pointer(type, x) {
    const event = new dom.window.Event(type, { bubbles: true });
    Object.assign(event, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: 150,
    });
    await act(() => stage.dispatchEvent(event));
  }
  assert.equal(stage.classList.contains('civ__stage--static'), true);
  await pointer('pointerdown', 250);
  await pointer('pointermove', 300);
  assert.equal(captured, false);
  await fire(baseImage(), 'load');
  await wheel();
  assert.equal(stage.classList.contains('civ__stage--static'), false);
  assertOnlySelectedSharp(exteriorFrames[0].zoomSrc);
  const layer = container.querySelector('.civ__zoom-layer');
  const beforePan = layer.style.transform;
  await pointer('pointerdown', 250);
  await pointer('pointermove', 300);
  assert.equal(captured, true);
  assert.notEqual(layer.style.transform, beforePan);
  await pointer('pointerup', 300);
  assert.equal(captured, false);
  await resetZoom();
  assert.equal(stage.classList.contains('civ__stage--static'), true);
});
