import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { FrameImage } from '../dist/components/FrameImage.js';
import { ZoomFrameImage } from '../dist/components/ZoomFrameImage.js';

const { act } = React;
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const labels = { loading: 'Loading', error: 'Failed', retry: 'Retry' };
const viewport = React.createRef();
const settled = [];
const errors = [];
const timers = new Map();
let nextTimer = 0;
let reducedMotion = false;
const preferenceListeners = new Set();
window.matchMedia = () => ({
  get matches() {
    return reducedMotion;
  },
  addEventListener: (_type, listener) => preferenceListeners.add(listener),
  removeEventListener: (_type, listener) => preferenceListeners.delete(listener),
});
window.setTimeout = (callback, delay) => {
  const id = ++nextTimer;
  timers.set(id, { callback, delay });
  return id;
};
window.clearTimeout = (id) => timers.delete(id);
let root;
let container;

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  document.body.replaceChildren();
  assert.equal(timers.size, 0, 'unmount cancels every fade fallback');
  assert.equal(preferenceListeners.size, 0, 'unmount removes media listeners');
  settled.length = 0;
  errors.length = 0;
  reducedMotion = false;
});

async function render(src, options = {}) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  const change = {
    viewMode: 'exterior',
    frameIndex: 0,
    frame: { src, cameraId: options.camera ?? 'front' },
  };
  const viewer = React.createElement(
    'div',
    { ref: viewport },
    React.createElement(
      'div',
      { className: 'civ__track' },
      React.createElement(FrameImage, {
        key: change.frame.cameraId,
        change,
        alt: 'Car',
        labels,
        fallbackSrc: options.fallbackSrc,
        enabled: options.enabled ?? true,
        onSettled: (image, loaded) => settled.push([image, loaded]),
        onImageError: (...args) => errors.push(args),
      }),
      options.sharp
        ? React.createElement(ZoomFrameImage, {
            src: options.sharp,
            change,
            active: true,
            labels,
            onImageError: undefined,
          })
        : null
    )
  );
  await act(async () =>
    root.render(
      options.strict
        ? React.createElement(React.StrictMode, null, viewer)
        : viewer
    )
  );
}

const current = () => container.querySelector('.civ__image');
const retained = () => container.querySelector('.civ__image--retained');
const foreground = () =>
  [...container.querySelectorAll('.civ__track .civ__image')]
    .sort(
      (left, right) =>
        Number(right.dataset.civLayer ?? 0) -
        Number(left.dataset.civLayer ?? 0)
    )
    .find(
      (element) =>
        element.naturalWidth > 0 &&
        !element.closest('[hidden]') &&
        window.getComputedStyle(element).visibility === 'visible' &&
        window.getComputedStyle(element).opacity !== '0'
    );
const foregroundSource = () => foreground()?.src;
const foregroundResolution = () => {
  const image = foreground();
  return image ? `${image.naturalWidth} x ${image.naturalHeight} px` : '-';
};
async function fire(element, type, properties = {}) {
  const event = new dom.window.Event(type, { bubbles: true });
  Object.assign(event, properties);
  await act(async () => element.dispatchEvent(event));
}
async function load(element = current(), width = 1920) {
  Object.defineProperties(element, {
    naturalWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: width * (9 / 16) },
  });
  await fire(element, 'load');
}
async function finish(element = current(), propertyName = 'opacity') {
  await fire(element, 'transitionend', { propertyName });
}
async function startFade() {
  await render('/old.webp');
  const old = current();
  await load();
  await render('/new.webp');
  const next = current();
  await load();
  return { old, next };
}

test('replacement fades over the same loaded pixels, keeps current first, and settles immediately', async () => {
  await render('/old.webp');
  assert.equal(current().style.opacity, '1', 'initial image never fades from blank');
  await load();
  const old = current();
  assert.equal(timers.size, 0);
  await render('/new.webp');
  const next = current();
  assert.equal(retained(), old, 'the old decoded image node is reused');
  assert.equal(next.getAttribute('src'), '/new.webp');
  assert.equal(next.style.opacity, '0');
  assert.equal(next.style.visibility, 'hidden');
  assert.equal(old.style.opacity, '1');
  assert.equal(old.style.visibility, 'visible');
  assert.equal(foregroundSource(), 'http://localhost/old.webp');
  assert.ok(container.querySelector('.civ__loading-veil'));
  await load(next);
  assert.equal(retained(), old, 'old pixels persist until the transition finishes');
  assert.equal(next, current(), 'current remains the first image for consumers');
  assert.equal(next.style.opacity, '1');
  assert.equal(next.style.visibility, 'visible');
  assert.ok(next.classList.contains('relative'));
  assert.ok(next.classList.contains('z-[1]'));
  assert.ok(old.classList.contains('absolute'));
  assert.ok(old.classList.contains('z-0'));
  assert.ok(next.classList.contains('transition-opacity'));
  assert.ok(next.classList.contains('duration-[400ms]'));
  assert.ok(next.classList.contains('motion-reduce:transition-none'));
  assert.equal(container.querySelector('.civ__loading-veil'), null);
  assert.deepEqual(settled, [[old, true], [next, true]]);
  assert.equal(timers.size, 1);
  await finish(next, 'transform');
  await finish(old);
  assert.equal(retained(), old, 'unrelated or retained-layer events are ignored');
  await finish(next);
  assert.equal(retained(), null);
  assert.equal(old.isConnected, false);
  assert.equal(next.isConnected, true);
  assert.equal(next.style.opacity, '1');
  assert.equal(foregroundSource(), 'http://localhost/new.webp');
  assert.equal(timers.size, 0);
});

test('missing transitionend completes with the 450ms fallback and tolerates duplicate events', async () => {
  const { next } = await startFade();
  const [{ callback, delay }] = timers.values();
  assert.equal(delay, 450);
  await act(async () => callback());
  assert.equal(retained(), null);
  assert.equal(current(), next);
  await finish(next);
  await fire(next, 'error');
  assert.equal(current(), next);
  assert.equal(errors.length, 0);
  assert.equal(settled.length, 2);
});

test('reduced motion reveals loaded replacements immediately and can stop a running fade', async () => {
  reducedMotion = true;
  await render('/old.webp');
  await load();
  await render('/new.webp');
  assert.ok(retained());
  await load();
  assert.equal(retained(), null);
  assert.equal(current().style.opacity, '1');
  assert.equal(timers.size, 0);
  reducedMotion = false;
  await render('/newer.webp');
  await load();
  assert.ok(retained());
  reducedMotion = true;
  await act(async () => {
    for (const listener of preferenceListeners) listener();
  });
  assert.equal(retained(), null);
  assert.equal(timers.size, 0);
});

test('failed replacement and retry preserve the original image until retry finishes fading', async () => {
  await render('/old.webp');
  await load();
  const old = current();
  await render('/failed.webp');
  const failed = current();
  await fire(failed, 'error');
  assert.equal(retained(), old);
  assert.equal(failed.style.opacity, '0');
  assert.equal(errors.length, 1);
  assert.ok(container.querySelector('[role="alert"]'));
  await act(async () => container.querySelector('button').click());
  const retry = current();
  assert.notEqual(retry, failed);
  assert.equal(retained(), old);
  await fire(failed, 'load');
  await fire(failed, 'error');
  await finish(failed);
  assert.equal(retry.style.visibility, 'hidden');
  assert.equal(errors.length, 1);
  await load(retry);
  assert.equal(retained(), old);
  assert.equal(settled.length, 3);
  await finish(retry);
  assert.equal(retained(), null);
  assert.equal(current(), retry);
});

test('rapid configuration changes cancel stale loads, fade events, and fallback timers', async () => {
  const { old, next } = await startFade();
  const [staleTimer] = timers.values();
  await render('/third.webp');
  const third = current();
  assert.equal(retained(), next, 'latest successfully loaded render is the fallback');
  assert.equal(next.style.opacity, '1');
  assert.equal(old.isConnected, false);
  assert.equal(timers.size, 0);
  await finish(next);
  await fire(old, 'error');
  await act(async () => staleTimer.callback());
  assert.equal(retained(), next);
  assert.equal(third.style.opacity, '0');
  await render('/fourth.webp');
  const fourth = current();
  await load(third);
  await fire(third, 'error');
  assert.equal(retained(), next);
  assert.equal(current(), fourth);
  assert.equal(fourth.style.opacity, '0');
  assert.equal(errors.length, 0);
  assert.equal(settled.length, 2);
  await load(fourth);
  await finish(third);
  await act(async () => staleTimer.callback());
  assert.equal(retained(), next, 'obsolete completions cannot clear a newer fade');
  await finish(fourth);
  assert.equal(retained(), null);
  assert.equal(current(), fourth);
  assert.equal(foregroundSource(), 'http://localhost/fourth.webp');
});

test('returning to an earlier source never leaves two copies or clears its current image', async () => {
  const { old, next } = await startFade();
  await render('/old.webp');
  const latest = current();
  assert.notEqual(latest, old, 'each request generation has its own event target');
  assert.equal(retained(), next);
  await load(old);
  await finish(old);
  assert.equal(latest.style.opacity, '0');
  await load(latest);
  await finish(next);
  assert.equal(retained(), next);
  await finish(latest);
  assert.equal(container.querySelectorAll('.civ__image').length, 1);
  assert.equal(current().getAttribute('src'), '/old.webp');
});

test('reverting configuration before it loads never clears the last decoded image', async () => {
  await render('/old.webp');
  await load();
  const old = current();
  await render('/pending.webp');
  const pending = current();
  await render('/old.webp');
  const latest = current();
  assert.equal(retained(), old);
  assert.equal(old.style.visibility, 'visible');
  assert.equal(latest.style.opacity, '0');
  await load(pending);
  await fire(pending, 'error');
  assert.equal(retained(), old);
  assert.equal(settled.length, 1);
  await load(latest);
  assert.equal(current(), latest);
  assert.equal(retained(), null, 'identical source needs no visual crossfade');
  assert.equal(latest.style.opacity, '1');
  assert.equal(latest.classList.contains('transition-opacity'), false);
  assert.equal(timers.size, 0);
});

test('ordinary camera changes do not crossfade and cancel outgoing transitions', async () => {
  const { next } = await startFade();
  const [staleTimer] = timers.values();
  await render('/rear.webp', { camera: 'rear' });
  const rear = current();
  assert.equal(retained(), null);
  assert.equal(rear.style.opacity, '1');
  assert.equal(timers.size, 0);
  await finish(next);
  await act(async () => staleTimer.callback());
  await load(rear);
  assert.equal(current(), rear);
  assert.equal(retained(), null);
  assert.equal(timers.size, 0);
});

test('4K foreground stays above both base layers as the real foreground', async () => {
  await startFade();
  await render('/new.webp', { sharp: '/sharp.webp' });
  const sharp = container.querySelector('.civ__zoom-quality img');
  assert.ok(sharp.parentElement.classList.contains('z-[3]'));
  assert.ok(current().classList.contains('z-[1]'));
  assert.equal(sharp.style.visibility, 'hidden');
  assert.equal(foregroundSource(), 'http://localhost/new.webp');
  await load(sharp, 3840);
  assert.equal(foregroundSource(), 'http://localhost/sharp.webp');
  await finish();
  assert.equal(foregroundSource(), 'http://localhost/sharp.webp');
  assert.equal(foregroundResolution(), '3840 x 2160 px');
});

test('fallback sources crossfade on first load, including disabled queue entries', async () => {
  await render('/new.webp', { enabled: false, fallbackSrc: '/old.webp' });
  assert.equal(current().hasAttribute('src'), false);
  await load(retained());
  await fire(current(), 'load');
  assert.equal(settled.length, 0);
  assert.equal(foregroundSource(), 'http://localhost/old.webp');
  await render('/new.webp', { fallbackSrc: '/old.webp' });
  await load();
  assert.ok(retained());
  assert.equal(settled.length, 1);
  await finish();
  assert.equal(retained(), null);
});

test('already-complete cached replacements establish a transparent start before fading', async () => {
  const prototype = dom.window.HTMLImageElement.prototype;
  const originals = Object.fromEntries(
    ['complete', 'naturalWidth', 'naturalHeight', 'getBoundingClientRect'].map(
      (name) => [name, Object.getOwnPropertyDescriptor(prototype, name)]
    )
  );
  const opacityAtLayout = [];
  Object.defineProperties(prototype, {
    complete: { configurable: true, get: () => true },
    naturalWidth: { configurable: true, get: () => 1920 },
    naturalHeight: { configurable: true, get: () => 1080 },
    getBoundingClientRect: {
      configurable: true,
      value() {
        opacityAtLayout.push(this.style.opacity);
        return { width: 1920, height: 1080 };
      },
    },
  });
  try {
    await render('/cached.webp', { fallbackSrc: '/old.webp' });
    assert.equal(current().style.opacity, '1');
    assert.equal(current().style.visibility, 'visible');
    assert.ok(retained());
    assert.deepEqual(opacityAtLayout, ['0']);
    assert.equal(settled.length, 1);
    await finish();
    assert.equal(retained(), null);
  } finally {
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(prototype, name, descriptor);
      else delete prototype[name];
    }
  }
});

test('StrictMode and unmount clean up transitions and ignore detached image events', async () => {
  await render('/old.webp', { strict: true });
  await load();
  await render('/new.webp', { strict: true });
  const next = current();
  await load();
  assert.equal(timers.size, 1);
  await act(async () => root.unmount());
  root = undefined;
  assert.equal(timers.size, 0);
  assert.equal(preferenceListeners.size, 0);
  await load(next);
  await finish(next);
  await fire(next, 'error');
  assert.equal(settled.length, 2);
  assert.equal(errors.length, 0);
});
