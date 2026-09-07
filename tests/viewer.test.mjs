import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act as legacyAct } from 'react-dom/test-utils';
import { ConfiguratorImageViewer } from 'cigs-viewer';

const act = React.act ?? legacyAct;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const preloaded = [];
globalThis.Image = class {
  set src(value) {
    preloaded.push(value);
  }
  removeAttribute() {}
};
const captures = new WeakMap();
dom.window.HTMLElement.prototype.setPointerCapture = function (id) {
  captures.set(this, id);
};
dom.window.HTMLElement.prototype.hasPointerCapture = function (id) {
  return captures.get(this) === id;
};
dom.window.HTMLElement.prototype.releasePointerCapture = function () {
  captures.delete(this);
};

const frames = (prefix, count) =>
  Array.from({ length: count }, (_, index) => ({
    src: `/${prefix}/${index}.webp`,
    alt: `${prefix} ${index}`,
  }));
const defaults = {
  exteriorFrames: frames('exterior', 4),
  interiorFrames: frames('interior', 3),
};
let root;
let container;

afterEach(async () => {
  if (root) await act(() => root.unmount());
  root = undefined;
  document.body.replaceChildren();
  preloaded.length = 0;
});

async function render(props = {}) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() =>
    root.render(
      React.createElement(ConfiguratorImageViewer, { ...defaults, ...props })
    )
  );
}
const activeImage = () => container.querySelector('.civ__image');
const stage = () => container.querySelector('.civ__stage');
const button = (text) =>
  [...container.querySelectorAll('button')].find(
    (item) => item.textContent === text
  );
async function click(text) {
  await act(() => button(text).click());
}
async function key(value) {
  await act(() =>
    stage().dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true })
    )
  );
}
async function pointer(type, x, y = 0, extra = {}) {
  const event = new dom.window.Event(type, { bubbles: true });
  Object.assign(event, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    ...extra,
  });
  await act(() => stage().dispatchEvent(event));
}

test('both views use ordinary image sequences and remember their own frame', async () => {
  const changes = [];
  await render({ onFrameChange: (change) => changes.push(change) });
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  await click('Next image');
  await click('Interior');
  assert.equal(activeImage().getAttribute('src'), '/interior/0.webp');
  await click('Next image');
  assert.equal(activeImage().getAttribute('src'), '/interior/1.webp');
  await click('Exterior');
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  assert.deepEqual(
    changes.map(({ viewMode, frameIndex }) => [viewMode, frameIndex]),
    [
      ['exterior', 1],
      ['interior', 1],
    ]
  );
  assert.equal(container.querySelectorAll('canvas, video, iframe').length, 0);
});

test('dragging is identical for exterior and interior, including reversing and wraparound', async () => {
  await render({ pixelsPerFrame: 20 });
  for (const mode of ['Exterior', 'Interior']) {
    await click(mode);
    await pointer('pointerdown', 100);
    await pointer('pointermove', 60);
    assert.equal(
      activeImage().getAttribute('src'),
      `/${mode.toLowerCase()}/2.webp`
    );
    await pointer('pointermove', 80);
    assert.equal(
      activeImage().getAttribute('src'),
      `/${mode.toLowerCase()}/1.webp`
    );
    await pointer('pointerup', 80);
    await key('Home');
    await key('ArrowLeft');
    assert.equal(
      activeImage().getAttribute('src'),
      `/${mode.toLowerCase()}/${mode === 'Exterior' ? 3 : 2}.webp`
    );
  }
});

test('vertical scrolling, non-primary input, cancellation and lost capture do not navigate', async () => {
  await render();
  await pointer('pointerdown', 100, 0, { button: 2 });
  await pointer('pointermove', 0);
  await pointer('pointerdown', 100, 0, { isPrimary: false });
  await pointer('pointermove', 0);
  await pointer('pointerdown', 100);
  await pointer('pointermove', 98, 40);
  await pointer('pointermove', 0, 40);
  await pointer('pointerdown', 100);
  await pointer('pointercancel', 100);
  await pointer('pointermove', 0);
  await pointer('pointerdown', 100);
  await pointer('lostpointercapture', 100);
  await pointer('pointermove', 0);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
});

test('controlled props notify the host without changing the displayed view or frame', async () => {
  const modes = [];
  const changes = [];
  const props = {
    viewMode: 'exterior',
    frameIndex: 0,
    onViewModeChange: (mode) => modes.push(mode),
    onFrameChange: (change) => changes.push(change),
  };
  await render(props);
  await click('Interior');
  await click('Next image');
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  assert.deepEqual(modes, ['interior']);
  assert.equal(changes[0].frameIndex, 1);
  await render({ ...props, viewMode: 'interior', frameIndex: 2 });
  assert.equal(activeImage().getAttribute('src'), '/interior/2.webp');
});

test('keyboard and buttons clamp without looping, including shortened sequences', async () => {
  await render({ loop: false });
  assert.equal(button('Previous image').disabled, true);
  await key('ArrowLeft');
  await key('End');
  assert.equal(activeImage().getAttribute('src'), '/exterior/3.webp');
  assert.equal(button('Next image').disabled, true);
  await key('ArrowRight');
  assert.equal(activeImage().getAttribute('src'), '/exterior/3.webp');
  await render({ exteriorFrames: frames('new', 2), loop: false });
  assert.equal(activeImage().getAttribute('src'), '/new/1.webp');
  await key('Home');
  assert.equal(activeImage().getAttribute('src'), '/new/0.webp');
});

test('empty and one-frame views show explicit status and disable navigation', async () => {
  await render({ exteriorFrames: [], interiorFrames: frames('interior', 1) });
  assert.match(container.textContent, /No images available/);
  assert.equal(button('Next image').disabled, true);
  assert.equal(container.querySelector('output').textContent, '0 / 0');
  await key('End');
  await click('Interior');
  assert.equal(button('Next image').disabled, true);
  assert.equal(button('Previous image').disabled, true);
  assert.equal(activeImage().getAttribute('src'), '/interior/0.webp');
});

test('loading errors are visible, reported once, retryable and reset on source changes', async () => {
  const errors = [];
  await render({
    onImageError: (error, change) => errors.push({ error, change }),
  });
  assert.match(
    container.querySelector('[role="status"]').textContent,
    /Loading/
  );
  await act(() => activeImage().dispatchEvent(new dom.window.Event('error')));
  await act(() => activeImage().dispatchEvent(new dom.window.Event('error')));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].change.frame.src, '/exterior/0.webp');
  assert.ok(errors[0].error instanceof Error);
  assert.match(
    container.querySelector('[role="alert"]').textContent,
    /could not be loaded/
  );
  const failedImage = activeImage();
  await click('Retry');
  assert.notEqual(activeImage(), failedImage);
  await act(() => activeImage().dispatchEvent(new dom.window.Event('load')));
  assert.equal(container.querySelector('[role="status"]'), null);
  assert.equal(activeImage().style.visibility, 'visible');
  await render({ exteriorFrames: frames('updated', 4) });
  assert.match(
    container.querySelector('[role="status"]').textContent,
    /Loading/
  );
  await act(() => failedImage.dispatchEvent(new dom.window.Event('load')));
  assert.match(
    container.querySelector('[role="status"]').textContent,
    /Loading/
  );
});

test('preloading is bounded, deduplicated, configurable and limited to the active view', async () => {
  await render();
  assert.deepEqual(preloaded, ['/exterior/3.webp', '/exterior/1.webp']);
  preloaded.length = 0;
  await render({ preloadRadius: 0 });
  await click('Interior');
  assert.deepEqual(preloaded, []);
  await render({ preloadRadius: 4 });
  assert.deepEqual(preloaded, ['/interior/2.webp', '/interior/1.webp']);
});

test('thumbnails are opt-in, use small sources only, and labels can be localized', async () => {
  await render();
  assert.equal(container.querySelector('.civ__thumbnails'), null);
  await render({
    exteriorFrames: [
      { src: '/full.webp', thumbnailSrc: '/thumb.webp' },
      { src: '/other.webp' },
    ],
    showThumbnails: true,
    labels: { next: 'Weiter', exterior: 'Exterieur' },
  });
  const thumbnails = container.querySelector('.civ__thumbnails');
  assert.equal(
    thumbnails.querySelector('img').getAttribute('src'),
    '/thumb.webp'
  );
  assert.equal(thumbnails.querySelector('img').getAttribute('loading'), 'lazy');
  assert.equal(thumbnails.querySelectorAll('img').length, 1);
  await click('Weiter');
  assert.equal(activeImage().getAttribute('src'), '/other.webp');
  assert.equal(activeImage().alt, 'Exterieur 2 / 2');
  assert.equal(thumbnails.querySelectorAll('[aria-pressed="true"]').length, 1);
});

test('multiple viewer instances have independent state and accessible IDs', async () => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(() =>
    root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(ConfiguratorImageViewer, defaults),
        React.createElement(ConfiguratorImageViewer, defaults)
      )
    )
  );
  const stages = [...container.querySelectorAll('.civ__stage')];
  assert.notEqual(
    stages[0].getAttribute('aria-describedby'),
    stages[1].getAttribute('aria-describedby')
  );
  await click('Next image');
  assert.deepEqual(
    [...container.querySelectorAll('.civ__image')].map((image) =>
      image.getAttribute('src')
    ),
    ['/exterior/1.webp', '/exterior/0.webp']
  );
});

test('already-complete images settle correctly, including cached failures', async () => {
  const prototype = dom.window.HTMLImageElement.prototype;
  const complete = Object.getOwnPropertyDescriptor(prototype, 'complete');
  const naturalWidth = Object.getOwnPropertyDescriptor(
    prototype,
    'naturalWidth'
  );
  Object.defineProperty(prototype, 'complete', {
    configurable: true,
    get: () => true,
  });
  Object.defineProperty(prototype, 'naturalWidth', {
    configurable: true,
    get: () => 1920,
  });
  try {
    await render();
    assert.equal(container.querySelector('[role="status"]'), null);
    Object.defineProperty(prototype, 'naturalWidth', {
      configurable: true,
      get: () => 0,
    });
    const errors = [];
    await render({
      exteriorFrames: frames('broken', 1),
      onImageError: (error) => errors.push(error),
    });
    assert.match(
      container.querySelector('[role="alert"]').textContent,
      /could not be loaded/
    );
    assert.equal(errors.length, 1);
  } finally {
    Object.defineProperty(prototype, 'complete', complete);
    Object.defineProperty(prototype, 'naturalWidth', naturalWidth);
  }
});

test('server HTML hydrates without mismatches and navigation remains interactive', async () => {
  container = document.createElement('div');
  container.innerHTML = renderToString(
    React.createElement(ConfiguratorImageViewer, defaults)
  );
  document.body.append(container);
  const errors = [];
  await act(() => {
    root = hydrateRoot(
      container,
      React.createElement(ConfiguratorImageViewer, defaults),
      { onRecoverableError: (error) => errors.push(error) }
    );
  });
  assert.deepEqual(errors, []);
  await click('Interior');
  await click('Next image');
  assert.equal(activeImage().getAttribute('src'), '/interior/1.webp');
});
