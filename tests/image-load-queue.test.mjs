import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { ImageLoadQueue } from '../dist/utils/image-load-queue.js';
import { adjacentSourceBatches } from '../dist/utils/frames.js';

const originalImage = globalThis.Image;
let requests;
let images;
let active;
let peak;

beforeEach(() => {
  requests = [];
  images = [];
  active = new Set();
  peak = 0;
  globalThis.Image = class {
    complete = false;
    naturalWidth = 0;
    onload = null;
    onerror = null;
    set src(value) {
      this.url = value;
      requests.push(value);
      images.push(this);
      active.add(this);
      peak = Math.max(peak, active.size);
    }
    removeAttribute() {
      active.delete(this);
      this.cancelled = true;
    }
    settle(success = true) {
      active.delete(this);
      this.complete = true;
      this.naturalWidth = success ? 800 : 0;
      if (success) this.onload?.();
      else this.onerror?.();
    }
  };
});
afterEach(() => {
  globalThis.Image = originalImage;
});

const currentImage = (src) => ({ getAttribute: () => src });
function plan(current, batches) {
  return { key: JSON.stringify([current, batches]), current, batches };
}

test('loads current first, then parallel distance pairs with a barrier between pairs', () => {
  const frames = Array.from({ length: 7 }, (_, i) => ({ src: `/${i}.webp` }));
  const batches = adjacentSourceBatches(frames, 3, frames.length - 1, true);
  assert.deepEqual(batches, [
    ['/2.webp', '/4.webp'],
    ['/1.webp', '/5.webp'],
    ['/0.webp', '/6.webp'],
  ]);
  const input = plan('/3.webp', batches);
  const queue = new ImageLoadQueue(input);
  queue.start(input);
  assert.deepEqual(requests, []);
  queue.settleCurrent(input.key, currentImage(input.current), true);
  assert.deepEqual(requests, ['/2.webp', '/4.webp']);
  queue.start({ ...input });
  assert.equal(images[0].cancelled, undefined);
  assert.equal(images[1].cancelled, undefined);
  for (let i = 0; i < batches.length; i++) {
    images[i * 2 + 1].settle();
    assert.deepEqual(requests, batches.slice(0, i + 1).flat());
    assert.equal(queue.getSnapshot().loaded.has(batches[i][1]), true);
    images[i * 2].settle();
    assert.deepEqual(requests, batches.slice(0, i + 2).flat());
  }
  assert.equal(peak, 2);
  assert.equal(active.size, 0);
  assert.equal(queue.getSnapshot().loaded.size, 7);
  queue.stop();
});

test('configuration replacement aborts work and ignores stale image callbacks', () => {
  const old = plan('/old/current', [['/old/left', '/old/right']]);
  const next = plan('/new/current', [['/new/left', '/new/right']]);
  const queue = new ImageLoadQueue(old);
  queue.start(old);
  queue.settleCurrent(old.key, currentImage(old.current), true);
  const stale = images.map((image) => image.onload);
  queue.start(next);
  assert.equal(images[0].cancelled, true);
  assert.equal(images[1].cancelled, true);
  for (const callback of stale) callback();
  queue.settleCurrent(old.key, currentImage(old.current), true);
  assert.deepEqual(requests, ['/old/left', '/old/right']);
  queue.settleCurrent(next.key, currentImage(next.current), true);
  assert.deepEqual(requests, [
    '/old/left',
    '/old/right',
    '/new/left',
    '/new/right',
  ]);
  assert.equal(peak, 2);
  assert.equal(queue.getSnapshot().loaded.has(old.current), false);
  queue.stop();
});

test('errors still wait for the partner and retry cancels both workers for the visible image', () => {
  const input = plan('/current', [
    ['/left', '/right'],
    ['/left2', '/right2'],
  ]);
  const queue = new ImageLoadQueue(input);
  queue.start(input);
  queue.settleCurrent(input.key, currentImage(input.current), false);
  assert.equal(queue.getSnapshot().failed.has('/current'), true);
  images[0].settle(false);
  assert.deepEqual(requests, ['/left', '/right']);
  assert.equal(queue.getSnapshot().failed.has('/left'), true);
  images[1].settle();
  assert.deepEqual(requests, ['/left', '/right', '/left2', '/right2']);
  queue.retryCurrent(input.key);
  assert.equal(images[2].cancelled, true);
  assert.equal(images[3].cancelled, true);
  assert.equal(active.size, 0);
  queue.settleCurrent(input.key, currentImage(input.current), true);
  assert.deepEqual(requests, [
    '/left',
    '/right',
    '/left2',
    '/right2',
    '/left2',
    '/right2',
  ]);
  images[4].settle();
  images[5].settle();
  assert.equal(peak, 2);
  assert.equal(queue.getSnapshot().failed.has('/current'), false);
  queue.stop();
});

test('completed images are reused on navigation and duplicate URLs never load twice', () => {
  const input = plan('/current', [
    ['/left', '/left', '/current', '/right'],
    ['/left'],
  ]);
  const queue = new ImageLoadQueue(input);
  queue.start(input);
  queue.settleCurrent(input.key, currentImage(input.current), true);
  images[0].settle();
  images[1].settle();
  queue.start(plan('/left', [['/right', '/current']]));
  assert.deepEqual(requests, ['/left', '/right']);
  assert.equal(queue.getSnapshot().loaded.size, 3);
  queue.stop();
});

test('stop cancels both active requests and no later callback starts another pair', () => {
  const input = plan('/current', [
    ['/left', '/right'],
    ['/left2', '/right2'],
  ]);
  const queue = new ImageLoadQueue(input);
  queue.start(input);
  queue.settleCurrent(input.key, currentImage(input.current), true);
  const callbacks = images.map((image) => image.onload);
  queue.stop();
  for (const callback of callbacks) callback();
  assert.deepEqual(requests, ['/left', '/right']);
  assert.ok(images.every((image) => image.cancelled));
  assert.equal(active.size, 0);
});

test('non-looping order and duplicate frame paths are bounded and deduplicated', () => {
  const frames = [{ src: '/a' }, { src: '/a' }, { src: '/b' }, { src: '/c' }];
  assert.deepEqual(adjacentSourceBatches(frames, 0, 100000, false), [
    ['/b'],
    ['/c'],
  ]);
  assert.deepEqual(adjacentSourceBatches([], 0, 4, true), []);
  const distinct = Array.from({ length: 6 }, (_, i) => ({ src: `/${i}` }));
  assert.deepEqual(adjacentSourceBatches(distinct, 0, 5, true), [
    ['/5', '/1'],
    ['/4', '/2'],
    ['/3'],
  ]);
  assert.deepEqual(adjacentSourceBatches(distinct, 1, 5, false), [
    ['/0', '/2'],
    ['/3'],
    ['/4'],
    ['/5'],
  ]);
  assert.deepEqual(adjacentSourceBatches(distinct, 2, 1, true), [['/1', '/3']]);
  assert.deepEqual(adjacentSourceBatches(distinct, 2, 0, true), []);
});

test('a cached partner is skipped without pulling a more distant frame into its pair', () => {
  const cached = plan('/current', [['/left']]);
  const queue = new ImageLoadQueue(cached);
  queue.start(cached);
  queue.settleCurrent(cached.key, currentImage(cached.current), true);
  images[0].settle();
  const next = plan('/current', [
    ['/left', '/right'],
    ['/left2', '/right2'],
  ]);
  queue.start(next);
  assert.deepEqual(requests, ['/left', '/right']);
  images[1].settle();
  assert.deepEqual(requests, ['/left', '/right', '/left2', '/right2']);
  queue.stop();
});

test('synchronous cache hits cannot advance past a reserved partner', () => {
  const MockImage = globalThis.Image;
  globalThis.Image = class extends MockImage {
    set src(value) {
      super.src = value;
      if (value === '/left') {
        active.delete(this);
        this.complete = true;
        this.naturalWidth = 800;
      }
    }
  };
  const input = plan('/current', [
    ['/left', '/right'],
    ['/left2', '/right2'],
  ]);
  const queue = new ImageLoadQueue(input);
  queue.start(input);
  queue.settleCurrent(input.key, currentImage(input.current), true);
  assert.deepEqual(requests, ['/left', '/right']);
  images[1].settle();
  assert.deepEqual(requests, ['/left', '/right', '/left2', '/right2']);
  assert.equal(peak, 2);
  queue.stop();
});

test('navigation during a pair cancels it and waits for the newly selected current image', () => {
  const input = plan('/current', [
    ['/left', '/right'],
    ['/left2', '/right2'],
  ]);
  const queue = new ImageLoadQueue(input);
  queue.start(input);
  queue.settleCurrent(input.key, currentImage(input.current), true);
  const stale = images.map((image) => image.onload);
  const next = plan('/right', [
    ['/current', '/right2'],
    ['/left', '/left2'],
  ]);
  queue.start(next);
  for (const callback of stale) callback();
  assert.equal(active.size, 0);
  assert.deepEqual(requests, ['/left', '/right']);
  queue.settleCurrent(next.key, currentImage(next.current), true);
  assert.deepEqual(requests, ['/left', '/right', '/right2']);
  images[2].settle();
  assert.deepEqual(requests, ['/left', '/right', '/right2', '/left', '/left2']);
  assert.equal(peak, 2);
  queue.stop();
});

test('each camera retains its last successful image until its new frame is ready', () => {
  const old = {
    ...plan('/old/current', [['/old/left']]),
    frames: new Map([
      ['C1', '/old/current'],
      ['C2', '/old/left'],
    ]),
  };
  const next = {
    ...plan('/new/current', [['/new/left']]),
    frames: new Map([
      ['C1', '/new/current'],
      ['C2', '/new/left'],
    ]),
  };
  const queue = new ImageLoadQueue(old);
  queue.start(old);
  queue.settleCurrent(old.key, currentImage(old.current), true);
  images[0].settle();
  queue.start(next);
  assert.deepEqual(
    [...queue.getSnapshot().retained.values()],
    ['/old/current', '/old/left']
  );
  queue.settleCurrent(next.key, currentImage(next.current), true);
  assert.deepEqual(
    [...queue.getSnapshot().retained.values()],
    ['/new/current', '/old/left']
  );
  images[1].settle();
  assert.deepEqual(
    [...queue.getSnapshot().retained.values()],
    ['/new/current', '/new/left']
  );
  queue.stop();
});
