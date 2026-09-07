import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act as legacyAct } from 'react-dom/test-utils';
import {
  CigsViewer,
  CigsViewerViewport,
  CigsViewerPreviousButton,
  CigsViewerNextButton,
  CigsViewerZoomResetButton,
  CigsViewerThumbnails,
  CigsViewerViewSwitchButton,
} from 'cigs-viewer';
import {
  DEFAULT_EXTERIOR_CAMERAS,
  DEFAULT_INTERIOR_CAMERAS,
} from 'cigs-viewer';
import { ImageFrameViewer } from '../dist/components/ImageFrameViewer.js';

const act = React.act ?? legacyAct;
const h = React.createElement;

function customLayout(viewportProps = {}, nextProps = {}) {
  return h(
    'section',
    { 'data-custom-layout': '' },
    h(
      CigsViewerViewport,
      viewportProps,
      h('span', { 'data-overlay': '' }, 'Overlay'),
      h(CigsViewerZoomResetButton)
    ),
    h(
      'nav',
      { 'aria-label': 'Camera controls' },
      h(CigsViewerPreviousButton),
      h(CigsViewerNextButton, nextProps)
    ),
    h(CigsViewerThumbnails)
  );
}

test('compound: undefined children keeps default UI; supplied null owns the empty layout', async () => {
  await render({ children: undefined });
  assert.ok(stage());
  assert.ok(container.querySelector('.civ__navigation'));
  assert.ok(button('Next image'));
  await render({ children: null, showDebug: true });
  assert.equal(stage(), null);
  assert.equal(container.querySelector('button'), null);
  assert.ok(container.querySelector('.civ__debug'));
});

test('compound: custom layout owns controls, keeps overlays and exposes unpositioned external primitives', async () => {
  await render({ children: h(CigsViewerViewport) });
  assert.equal(container.querySelector('button'), null);
  assert.ok(activeImage());
  assert.equal(
    stage().querySelector('output').getAttribute('aria-live'),
    'polite'
  );
  await render({
    children: customLayout(),
    showThumbnails: true,
    showDebug: true,
  });
  assert.equal(container.querySelector('.civ__navigation'), null);
  assert.equal(button('Next image').closest('.civ__stage'), null);
  assert.equal(button('Next image').classList.contains('absolute'), false);
  assert.equal(
    container.querySelector('.civ__thumbnails').classList.contains('absolute'),
    false
  );
  assert.ok(stage().querySelector('[data-overlay]'));
  assert.equal(
    container
      .querySelector('.civ')
      .lastElementChild.classList.contains('civ__debug'),
    true
  );
  await act(async () => button('Next image').click());
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  await act(async () =>
    stage().dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
      })
    )
  );
  assert.equal(activeImage().getAttribute('src'), '/exterior/3.webp');
  assert.equal(stage().querySelector('output').textContent, '4 / 4');
});

test('compound: slot classes merge defaults, state and arbitrary variants before local classes', async () => {
  const classNames = {
    root: 'bg-red-500 [--civ-background:#000] w-1/2',
    viewport: 'aspect-square cursor-crosshair',
    navigation: 'z-10',
    previousButton: 'bg-red-500 left-8 enabled:hover:bg-red-600',
    nextButton: 'bg-red-500 md:bg-red-600 [&>svg]:size-8',
    zoomResetButton: 'bg-red-500 top-6',
    thumbnails: 'relative gap-4 p-5',
    thumbnail: 'aria-pressed:border-red-500 aria-pressed:opacity-50 p-4',
    thumbnailImage: 'h-10 w-20 object-cover',
    viewSwitchButton: 'bg-blue-500',
    debug: 'grid-cols-1 p-8',
  };
  await render({
    classNames,
    className: 'w-full bg-green-500',
    showThumbnails: true,
    enableZoom: true,
    showDebug: true,
  });
  await loadCurrent();
  sizeSlider();
  await wheel(-200);
  const has = (selector, included, excluded) => {
    const classes = container.querySelector(selector).classList;
    for (const value of included)
      assert.ok(classes.contains(value), `${selector} missing ${value}`);
    for (const value of excluded)
      assert.ok(!classes.contains(value), `${selector} retained ${value}`);
  };
  has(
    '.civ',
    ['bg-green-500', 'w-full', '[--civ-background:#000]'],
    ['bg-red-500', 'w-1/2', '[--civ-background:#f4f4f4]']
  );
  has('.civ__stage', ['aspect-square'], ['aspect-[var(--civ-aspect-ratio)]']);
  has('.civ__navigation', ['z-10'], ['z-[3]']);
  has(
    '.civ__previous',
    ['left-8', 'enabled:hover:bg-red-600'],
    ['left-[4px]', 'enabled:hover:bg-black/45']
  );
  has(
    '.civ__thumbnails',
    ['relative', 'gap-4', 'p-5'],
    ['absolute', 'gap-[6px]', 'p-[3px]']
  );
  has(
    '.civ__thumbnail',
    ['aria-pressed:border-red-500', 'aria-pressed:opacity-50'],
    ['aria-pressed:border-white', 'aria-pressed:opacity-100']
  );
  has(
    '.civ__thumbnail-image',
    ['h-10', 'w-20', 'object-cover'],
    ['h-[36px]', 'w-[64px]', 'object-contain']
  );
  has('.civ__view-thumbnail', ['bg-blue-500'], ['bg-black/25']);
  has(
    '.civ__reset-zoom',
    ['bg-red-500', 'top-6'],
    ['bg-black/55', 'top-[8px]']
  );
  has(
    '.civ__debug',
    ['grid-cols-1', 'p-8'],
    ['grid-cols-[max-content_minmax(0,1fr)]', 'p-[12px]']
  );

  await render({
    classNames,
    showThumbnails: true,
    children: customLayout(
      { className: 'aspect-video' },
      {
        className: 'bg-green-500 md:bg-green-600 [&>svg]:size-12',
      }
    ),
  });
  has('.civ__stage', ['aspect-video'], ['aspect-square']);
  has(
    '.civ__next',
    ['bg-green-500', 'md:bg-green-600', '[&>svg]:size-12'],
    ['bg-red-500', 'md:bg-red-600', '[&>svg]:size-8']
  );
  has('.civ__thumbnails', ['relative', 'gap-4', 'p-5'], ['absolute']);
  assert.equal(
    container.querySelector('.civ__zoom-layer').style.transform,
    'translate3d(0px, 0px, 0) scale(1)'
  );
});

const DesignButton = React.forwardRef(function DesignButton(props, ref) {
  return h('button', { ...props, ref });
});

test('compound: asChild composes native design-system refs and events without replacing navigation', async () => {
  const calls = [];
  const outerRef = React.createRef();
  const innerRef = React.createRef();
  await render({
    classNames: { nextButton: 'w-12 bg-red-500 md:bg-red-500' },
    children: h(
      React.Fragment,
      null,
      h(CigsViewerViewport),
      h(
        CigsViewerNextButton,
        {
          asChild: true,
          ref: outerRef,
          className: 'w-14 bg-green-500',
          onClick: () => calls.push('control'),
        },
        h(
          DesignButton,
          {
            ref: innerRef,
            className: 'w-16 bg-blue-500 md:bg-blue-500',
            onClick: () => calls.push('child'),
          },
          'Forward'
        )
      )
    ),
  });
  assert.equal(outerRef.current, innerRef.current);
  assert.equal(outerRef.current, button('Next image'));
  assert.equal(outerRef.current.type, 'button');
  assert.equal(container.querySelectorAll('button').length, 1);
  assert.ok(outerRef.current.classList.contains('bg-blue-500'));
  assert.ok(outerRef.current.classList.contains('md:bg-blue-500'));
  assert.ok(!outerRef.current.classList.contains('bg-green-500'));
  assert.ok(outerRef.current.classList.contains('w-16'));
  for (const width of ['w-[44px]', 'w-12', 'w-14']) {
    assert.ok(!outerRef.current.classList.contains(width));
  }
  await click('Next image');
  assert.deepEqual(calls, ['child', 'control']);
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  await render({ children: null });
  assert.equal(outerRef.current, null);
  assert.equal(innerRef.current, null);
});

test('compound: preventDefault on either asChild handler cancels the internal action', async () => {
  for (const preventOnChild of [true, false]) {
    const events = [];
    await render({
      frameIndex: 0,
      onFrameChange: () => events.push('navigation'),
      children: h(
        CigsViewerNextButton,
        {
          asChild: true,
          onClick: (event) => {
            events.push('control');
            if (!preventOnChild) event.preventDefault();
          },
        },
        h(
          DesignButton,
          {
            onClick: (event) => {
              events.push('child');
              if (preventOnChild) event.preventDefault();
            },
          },
          'Forward'
        )
      ),
    });
    await click('Next image');
    assert.deepEqual(events, ['child', 'control']);
  }
});

test('compound: asChild requires one supplied element rather than slotting default artwork', () => {
  assert.throws(
    () =>
      renderToString(
        h(ImageFrameViewer, {
          ...defaults,
          children: h(CigsViewerNextButton, { asChild: true }),
        })
      ),
    /single React element child/
  );
  assert.throws(
    () =>
      renderToString(
        h(ImageFrameViewer, {
          ...defaults,
          children: h(
            CigsViewerNextButton,
            { asChild: true },
            h('button', null, 'One'),
            h('button', null, 'Two')
          ),
        })
      ),
    /single React element child/
  );
});

test('compound: asChild retains disabled boundaries, labels and button type inside forms', async () => {
  let calls = 0;
  await render({
    loop: false,
    children: h(
      'form',
      {
        onSubmit: () => {
          calls++;
        },
      },
      h(CigsViewerViewport),
      h(
        CigsViewerPreviousButton,
        { asChild: true },
        h(DesignButton, { disabled: false, type: 'submit' }, 'Back')
      ),
      h(
        CigsViewerNextButton,
        { asChild: true },
        h(
          DesignButton,
          {
            disabled: true,
            onClick: () => {
              calls++;
            },
          },
          'Forward'
        )
      )
    ),
  });
  assert.equal(button('Previous image').disabled, true);
  assert.equal(button('Previous image').type, 'button');
  assert.equal(button('Next image').disabled, true);
  await click('Previous image');
  await click('Next image');
  assert.equal(calls, 0);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
});

test('compound: controlled actions finish the shared 600ms transition before callbacks', async () => {
  const changes = [];
  const modes = [];
  const children = customLayout();
  const options = {
    children,
    frameIndex: 0,
    viewMode: 'exterior',
    onFrameChange: (change) => changes.push(change.frameIndex),
    onViewModeChange: (mode) => modes.push(mode),
  };
  await render(options);
  sizeSlider();
  const originalLayout = container.querySelector('[data-custom-layout]');
  await click('Next image', false);
  assert.deepEqual(changes, []);
  assert.ok(
    container
      .querySelector('.civ__track')
      .classList.contains('duration-[600ms]')
  );
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  await finishSlide();
  assert.deepEqual(changes, [1]);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  await render({ ...options, frameIndex: 1 });
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  await click('Interior', false);
  assert.deepEqual(modes, []);
  await finishSlide();
  assert.deepEqual(modes, ['interior']);
  await render({ ...options, frameIndex: 1, viewMode: 'interior' });
  assert.equal(container.querySelector('[data-custom-layout]'), originalLayout);
  assert.equal(activeImage().getAttribute('src'), '/interior/1.webp');
});

test('compound: consumer state and viewport survive camera and view changes, remembering each camera', async () => {
  let mounts = 0;
  function Layout() {
    const [value, setValue] = React.useState(0);
    React.useEffect(() => {
      mounts++;
    }, []);
    return h(
      'section',
      null,
      h(
        'button',
        { onClick: () => setValue((count) => count + 1) },
        `Local ${value}`
      ),
      customLayout()
    );
  }
  await render({ children: h(Layout), showThumbnails: true });
  const originalStage = stage();
  await click('Local 0');
  await click('Next image');
  await click('Interior');
  await click('Next image');
  await click('Next image');
  await click('Exterior');
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  await click('Interior');
  assert.equal(activeImage().getAttribute('src'), '/interior/2.webp');
  assert.equal(stage(), originalStage);
  assert.ok(button('Local 1'));
  assert.equal(mounts, 1);
});

test('compound: default, styled and custom mode changes preserve active and remembered cameras', async () => {
  const children = h(
    React.Fragment,
    null,
    h(
      CigsViewerViewport,
      null,
      h(
        CigsViewerPreviousButton,
        { asChild: true },
        h('button', { className: 'w-16 bg-blue-500' }, 'Previous')
      ),
      h(
        CigsViewerNextButton,
        { asChild: true },
        h('button', { className: 'w-20 bg-green-500' }, 'Next')
      ),
      h(CigsViewerZoomResetButton)
    ),
    h(CigsViewerThumbnails)
  );
  await renderConfiguration({ showThumbnails: true });
  await click('Next image');
  const exteriorSource = activeImage().getAttribute('src');
  await click('Interior');
  await click('Next image');
  const interiorSource = activeImage().getAttribute('src');
  await renderConfiguration({
    showThumbnails: true,
    classNames: { root: 'bg-white' },
  });
  assert.equal(activeImage().getAttribute('src'), interiorSource);
  await renderConfiguration({ showThumbnails: true, children });
  assert.equal(activeImage().getAttribute('src'), interiorSource);
  assert.equal(button('Next image').closest('.civ__stage'), stage());
  assert.equal(
    container.querySelector('.civ__thumbnails').closest('.civ__stage'),
    null
  );
  assert.ok(button('Next image').classList.contains('w-20'));
  assert.ok(!button('Next image').classList.contains('w-[44px]'));
  assert.ok(!button('Next image').classList.contains('bg-transparent'));
  await click('Next image');
  const nextInteriorSource = activeImage().getAttribute('src');
  assert.notEqual(nextInteriorSource, interiorSource);
  await renderConfiguration({ showThumbnails: true });
  assert.equal(activeImage().getAttribute('src'), nextInteriorSource);
  await click('Exterior');
  assert.equal(activeImage().getAttribute('src'), exteriorSource);
  await renderConfiguration({ showThumbnails: true, children });
  await click('Interior');
  assert.equal(activeImage().getAttribute('src'), nextInteriorSource);
});

test('compound: thumbnails follow visibility, single-camera and absent-view rules', async () => {
  const children = customLayout();
  await render({ children, showThumbnails: false });
  assert.equal(container.querySelectorAll('[aria-pressed]').length, 0);
  assert.ok(button('Interior'));
  assert.equal(button('Interior').querySelector('img'), null);
  await render({
    children,
    showThumbnails: true,
    exteriorFrames: frames('one', 1),
  });
  assert.equal(container.querySelectorAll('[aria-pressed]').length, 0);
  assert.equal(button('Next image'), undefined);
  await click('Interior');
  assert.equal(container.querySelectorAll('[aria-pressed]').length, 3);
  await click('Exterior');
  await render({
    children,
    exteriorFrames: frames('one', 1),
    interiorFrames: [],
    showThumbnails: true,
  });
  assert.equal(container.querySelector('.civ__thumbnails'), null);
  assert.equal(button('Interior'), undefined);
});

test('compound: thumbnail image sizes also size unloaded and retained preview wrappers', async () => {
  const thumbnailImage = 'h-12 w-24 sm:h-16 sm:w-32 rounded-xl object-cover';
  const props = {
    children: customLayout(),
    showThumbnails: true,
    classNames: { thumbnailImage },
  };
  await render(props);
  const assertSizes = (elements) => {
    assert.ok(elements.length > 0);
    for (const element of elements) {
      for (const token of thumbnailImage.split(' ')) {
        assert.ok(element.classList.contains(token), `missing ${token}`);
      }
      assert.ok(!element.classList.contains('h-[36px]'));
      assert.ok(!element.classList.contains('w-[64px]'));
    }
  };
  assert.equal(container.querySelector('.civ__thumbnail-image'), null);
  assertSizes(container.querySelectorAll('.civ__thumbnail-placeholder'));
  await loadCurrent();
  await finishPreloads();
  assertSizes(container.querySelectorAll('.civ__thumbnail-image'));
  assertSizes(container.querySelectorAll('.civ__thumbnail-placeholder'));
  assert.ok(button('Interior').querySelector('.civ__thumbnail-image'));
  const retainedPreview = container.querySelector('.civ__thumbnail-image');
  await render({ ...props, exteriorFrames: frames('replacement', 4) });
  assert.equal(
    container.querySelector('.civ__thumbnail-image'),
    retainedPreview
  );
  assertSizes(container.querySelectorAll('.civ__thumbnail-placeholder'));
  assertSizes(container.querySelectorAll('.civ__thumbnail-image'));
});

test('compound: standalone view switch and zoom reset support asChild and work outside the viewport', async () => {
  await render({
    enableZoom: true,
    children: h(
      React.Fragment,
      null,
      h(CigsViewerViewport),
      h(
        CigsViewerViewSwitchButton,
        { asChild: true },
        h(DesignButton, null, 'Switch')
      ),
      h(
        CigsViewerZoomResetButton,
        { asChild: true },
        h(DesignButton, null, 'Reset')
      )
    ),
  });
  sizeSlider();
  await wheel(-200);
  assert.ok(zoomScale() > 1);
  assert.equal(button('Reset zoom').closest('.civ__stage'), null);
  await click('Reset zoom');
  assert.equal(zoomScale(), 1);
  assert.equal(button('Reset zoom'), undefined);
  await click('Interior');
  assert.equal(stage().getAttribute('aria-label'), 'Interior');
  assert.equal(button('Exterior').type, 'button');
});

test('compound: every public primitive fails clearly outside a provider', () => {
  for (const component of [
    CigsViewerViewport,
    CigsViewerPreviousButton,
    CigsViewerNextButton,
    CigsViewerZoomResetButton,
    CigsViewerThumbnails,
    CigsViewerViewSwitchButton,
  ]) {
    assert.throws(
      () => renderToString(h(component)),
      /must be rendered inside CigsViewer/
    );
  }
});

test('compound: separate instances isolate controls, frames and keyboard instruction IDs', async () => {
  await render();
  await act(() =>
    root.render(
      h(
        React.Fragment,
        null,
        h(ImageFrameViewer, { ...defaults, children: customLayout() }),
        h(ImageFrameViewer, { ...defaults, children: customLayout() })
      )
    )
  );
  const viewers = [...container.querySelectorAll('.civ')];
  await act(() => viewers[0].querySelector('.civ__next').click());
  assert.equal(
    viewers[0].querySelector('.civ__image').getAttribute('src'),
    '/exterior/1.webp'
  );
  assert.equal(
    viewers[1].querySelector('.civ__image').getAttribute('src'),
    '/exterior/0.webp'
  );
  const ids = viewers.map((viewer) =>
    viewer.querySelector('.civ__stage').getAttribute('aria-describedby')
  );
  assert.notEqual(ids[0], ids[1]);
  for (const id of ids) assert.ok(document.getElementById(id));
});

test('compound: removing and remounting viewport cancels motion and reconnects wheel handlers', async () => {
  const changes = [];
  const options = {
    enableZoom: true,
    onFrameChange: (change) => changes.push(change.frameIndex),
  };
  await render({ ...options, children: customLayout() });
  sizeSlider();
  await click('Next image', false);
  assert.ok(container.querySelector('.civ__track--settling'));
  const oldCanvas = container.querySelector('.civ__canvas');
  await render({ ...options, children: h(CigsViewerNextButton) });
  assert.equal((await wheel(-200, {}, oldCanvas)).defaultPrevented, false);
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.deepEqual(changes, []);
  await render({ ...options, children: customLayout() });
  assert.equal(container.querySelector('.civ__track--settling'), null);
  assert.equal(zoomScale(), 1);
  sizeSlider();
  await wheel(-200);
  assert.ok(zoomScale() > 1);
  await click('Next image');
  assert.deepEqual(changes, [1]);
});

test('compound: multiple mounted viewports fail rather than silently sharing gesture refs', async () => {
  await render();
  await assert.rejects(async () => {
    await act(() =>
      root.render(
        h(ImageFrameViewer, {
          ...defaults,
          children: h(
            React.Fragment,
            null,
            h(CigsViewerViewport),
            h(CigsViewerViewport)
          ),
        })
      )
    );
  }, /only one mounted CigsViewerViewport/);
});

test('compound: public root hydrates custom controls without warnings and preserves keyboard a11y', async () => {
  const element = h(CigsViewer, {
    configuration: { B: '01' },
    baseUrl: '/renders',
    cameras: ['C1', 'C2', 'C6'],
    children: customLayout(),
  });
  container = document.createElement('div');
  document.body.append(container);
  container.innerHTML = renderToString(element);
  const errors = [];
  await act(async () => {
    root = hydrateRoot(container, element, {
      onRecoverableError: (error) => errors.push(error),
    });
  });
  assert.deepEqual(errors, []);
  assert.equal(stage().tabIndex, 0);
  assert.ok(document.getElementById(stage().getAttribute('aria-describedby')));
  assert.match(activeImage().getAttribute('src'), /_C1_PQM-FHD/);
  await key('ArrowRight');
  assert.match(activeImage().getAttribute('src'), /_C2_PQM-FHD/);
  await act(() =>
    button('Previous image').dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
      })
    )
  );
  assert.match(
    activeImage().getAttribute('src'),
    /_C2_PQM-FHD/,
    'control keys never trigger viewport navigation'
  );
});

test('compound: StrictMode ref replay and cleanup keep asChild controls usable', async () => {
  const buttonRef = React.createRef();
  const viewportRef = React.createRef();
  await render();
  await act(async () =>
    root.render(
      h(
        React.StrictMode,
        null,
        h(ImageFrameViewer, {
          ...defaults,
          enableZoom: true,
          children: h(
            React.Fragment,
            null,
            h(CigsViewerViewport, { ref: viewportRef }),
            h(
              CigsViewerNextButton,
              { asChild: true, ref: buttonRef },
              h(DesignButton, null, 'Forward')
            )
          ),
        })
      )
    )
  );
  assert.equal(viewportRef.current, stage());
  assert.equal(buttonRef.current, button('Next image'));
  sizeSlider();
  await wheel(-200);
  assert.ok(zoomScale() > 1);
  await click('Next image');
  assert.equal(zoomScale(), 1);
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  await render({ children: null });
  assert.equal(viewportRef.current, null);
  assert.equal(buttonRef.current, null);
});

test(
  'compound: React 19 callback-ref cleanup is composed for slot and viewport',
  {
    skip: Number(React.version.split('.')[0]) < 19,
  },
  async () => {
    const cleanups = [];
    const ref = (name) => (element) => {
      assert.ok(element);
      return () => cleanups.push(name);
    };
    await render({
      children: h(
        React.Fragment,
        null,
        h(CigsViewerViewport, { ref: ref('viewport') }),
        h(
          CigsViewerNextButton,
          { asChild: true, ref: ref('control') },
          h(DesignButton, { ref: ref('child') }, 'Forward')
        )
      ),
    });
    await render({ children: null });
    assert.deepEqual(cleanups.sort(), ['child', 'control', 'viewport']);
    await render({ children: customLayout() });
    await click('Next image');
    assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  }
);

test('compound: custom renderer preserves retained base pixels, 400ms crossfade and paired preloads', async () => {
  const children = customLayout();
  await render({ children, showThumbnails: true });
  await loadCurrent();
  assert.deepEqual(preloaded, ['/exterior/3.webp', '/exterior/1.webp']);
  const previousImage = activeImage();
  await render({
    children,
    showThumbnails: true,
    exteriorFrames: frames('replacement', 4),
  });
  assert.equal(container.querySelector('.civ__image--retained'), previousImage);
  assert.equal(activeImage().style.opacity, '0');
  assert.equal(previousImage.style.opacity, '1');
  await loadCurrent();
  assert.ok(activeImage().classList.contains('duration-[400ms]'));
  assert.equal(container.querySelector('.civ__image--retained'), previousImage);
  const event = new dom.window.Event('transitionend', { bubbles: true });
  Object.assign(event, { propertyName: 'opacity' });
  await act(() => activeImage().dispatchEvent(event));
  assert.equal(container.querySelector('.civ__image--retained'), null);
  assert.equal(activeImage().getAttribute('src'), '/replacement/0.webp');
});

test('exported default cameras cannot be mutated between viewer instances', () => {
  assert.throws(() => {
    DEFAULT_EXTERIOR_CAMERAS[0].id = 'CHANGED';
  }, TypeError);
  assert.throws(() => {
    DEFAULT_INTERIOR_CAMERAS.push({ id: 'CHANGED' });
  }, TypeError);
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const preloaded = [];
const preloadImages = [];
globalThis.Image = class {
  set src(value) {
    preloaded.push(value);
    preloadImages.push(this);
  }
  removeAttribute() {
    this.cancelled = true;
  }
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
  preloadImages.length = 0;
});

async function render(props = {}) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(() =>
    root.render(
      React.createElement(ImageFrameViewer, { ...defaults, ...props })
    )
  );
}
const activeImage = () => container.querySelector('.civ__image');
const stage = () => container.querySelector('.civ__stage');
const button = (text) =>
  [...container.querySelectorAll('button')].find(
    (item) =>
      item.getAttribute('aria-label') === text || item.textContent === text
  );
async function click(text, complete = true) {
  await act(() => button(text).click());
  if (complete && container.querySelector('.civ__track--settling'))
    await finishSlide();
}
async function selectView(mode) {
  if (stage().getAttribute('aria-label') !== mode) await click(mode);
}
async function key(value, complete = true) {
  await act(() =>
    stage().dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true })
    )
  );
  if (complete && container.querySelector('.civ__track--settling'))
    await finishSlide();
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
  await act(() =>
    (container.querySelector('.civ__slider') ?? stage()).dispatchEvent(event)
  );
}

function sizeSlider(width = 500) {
  for (const element of container.querySelectorAll(
    '.civ__stage, .civ__slider, .civ__canvas'
  )) {
    element.getBoundingClientRect = () => ({
      width,
      height: (width * 9) / 16,
      left: 0,
      top: 0,
      right: width,
      bottom: (width * 9) / 16,
    });
  }
}

async function finishSlide() {
  const event = new dom.window.Event('transitionend', { bubbles: true });
  Object.assign(event, { propertyName: 'transform' });
  await act(() => container.querySelector('.civ__track').dispatchEvent(event));
}

async function loadCurrent() {
  await act(() => activeImage().dispatchEvent(new dom.window.Event('load')));
}

async function finishPreloads() {
  for (let i = 0; i < preloadImages.length; i++) {
    await act(() => preloadImages[i].onload?.());
  }
}

async function wheel(
  deltaY,
  extra = {},
  target = container.querySelector('.civ__canvas')
) {
  const event = new dom.window.WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: 250,
    clientY: 140.625,
    deltaY,
    ...extra,
  });
  await act(() => target.dispatchEvent(event));
  return event;
}

const zoomTransform = () =>
  container.querySelector('.civ__zoom-layer').style.transform;
const zoomScale = () => Number(zoomTransform().match(/scale\(([^)]+)\)/)[1]);

test('overlay arrows and thumbnails replace the toolbar and position view switches first or last', async () => {
  await render({ showThumbnails: true });
  assert.equal(container.querySelector('.civ__views'), null);
  assert.equal(button('Next image').closest('.civ__stage'), stage());
  assert.equal(button('Previous image').closest('.civ__stage'), stage());
  assert.equal(
    container.querySelector('.civ__thumbnails').closest('.civ__stage'),
    stage()
  );
  assert.ok(
    container.querySelector('output').classList.contains('civ__sr-only')
  );
  assert.equal(
    container.querySelector('.civ__thumbnails').lastElementChild,
    button('Interior')
  );
  await click('Next image');
  await click('Interior');
  assert.equal(
    container.querySelector('.civ__thumbnails').firstElementChild,
    button('Exterior')
  );
  await click('Exterior');
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  await render({ interiorFrames: [] });
  assert.equal(button('Interior'), undefined);
});

test('the view-switch preview waits behind paired frames and reuses ready main frames for thumbnails', async () => {
  await render({ showThumbnails: true });
  assert.deepEqual(preloaded, []);
  await loadCurrent();
  assert.deepEqual(preloaded, ['/exterior/3.webp', '/exterior/1.webp']);
  assert.equal(
    container.querySelector('.civ__thumbnails img').getAttribute('src'),
    '/exterior/0.webp'
  );
  await act(() => preloadImages[1].onload());
  assert.equal(preloaded.length, 2);
  await act(() => preloadImages[0].onload());
  assert.deepEqual(preloaded, [
    '/exterior/3.webp',
    '/exterior/1.webp',
    '/exterior/2.webp',
  ]);
  await act(() => preloadImages[2].onload());
  assert.equal(preloaded.at(-1), '/interior/0.webp');
  assert.equal(container.querySelector('.civ__view-thumbnail img'), null);
  await act(() => preloadImages[3].onload());
  assert.equal(
    container.querySelector('.civ__view-thumbnail img').getAttribute('src'),
    '/interior/0.webp'
  );
});

test('wheel zoom is opt-in, bounded, and does not intercept browser zoom or overlay controls', async () => {
  await render();
  sizeSlider();
  assert.equal((await wheel(-200)).defaultPrevented, false);
  assert.equal(zoomScale(), 1);
  await render({ enableZoom: true, showThumbnails: true });
  assert.equal((await wheel(-200, { ctrlKey: true })).defaultPrevented, false);
  assert.equal((await wheel(-200, { metaKey: true })).defaultPrevented, false);
  assert.equal(
    (await wheel(-200, {}, button('Next image'))).defaultPrevented,
    false
  );
  assert.equal(
    (await wheel(-200, {}, container.querySelector('.civ__thumbnails')))
      .defaultPrevented,
    false
  );
  assert.equal(zoomScale(), 1);
  assert.equal((await wheel(-200)).defaultPrevented, true);
  assert.equal(document.activeElement, stage());
  assert.ok(zoomScale() > 1);
  for (let i = 0; i < 10; i++) await wheel(-200);
  assert.equal(zoomScale(), 4);
  for (let i = 0; i < 10; i++) await wheel(200);
  assert.equal(zoomScale(), 1);
  assert.equal(button('Reset zoom'), undefined);
});

test('zoom follows the cursor and pans within bounds without selecting another camera', async () => {
  const changes = [];
  await render({
    enableZoom: true,
    onFrameChange: (change) => changes.push(change),
  });
  sizeSlider();
  await wheel(-200, { clientX: 375 });
  const scale = zoomScale();
  const offset = Number(zoomTransform().match(/translate3d\(([^p]+)px/)[1]);
  assert.ok(Math.abs(offset + 125 * (scale - 1)) < 0.001);
  await pointer('pointerdown', 250, 140);
  await pointer('pointermove', 10000, 10000);
  assert.equal(
    zoomTransform(),
    `translate3d(${(500 * (scale - 1)) / 2}px, ${(281.25 * (scale - 1)) / 2}px, 0) scale(${scale})`
  );
  await pointer('pointerup', 10000, 10000);
  assert.equal(captures.has(stage()), false);
  assert.equal(changes.length, 0);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  await key('Escape');
  assert.equal(zoomScale(), 1);
  await pointer('pointerdown', 250);
  await pointer('pointermove', 200);
  await pointer('pointerup', 200);
  await finishSlide();
  assert.equal(changes.length, 1);
});

test('zoom resets on navigation, source changes, resize, mode changes and disabling the prop', async () => {
  await render({ enableZoom: true });
  sizeSlider();
  await wheel(-200);
  await click('Reset zoom');
  assert.equal(zoomScale(), 1);
  await wheel(-200);
  await click('Next image');
  assert.equal(zoomScale(), 1);
  await wheel(-200);
  await render({ enableZoom: true, exteriorFrames: frames('new', 4) });
  assert.equal(zoomScale(), 1);
  await wheel(-200);
  await act(() => window.dispatchEvent(new dom.window.Event('resize')));
  assert.equal(zoomScale(), 1);
  await wheel(-200);
  await click('Interior');
  assert.equal(zoomScale(), 1);
  sizeSlider();
  await wheel(-200);
  await render({ enableZoom: false });
  assert.equal(zoomScale(), 1);
  assert.equal((await wheel(-200)).defaultPrevented, false);
});

test('zoom works in sequence mode and remains inactive while a slide is dragging or settling', async () => {
  await render({ enableZoom: true, dragMode: 'sequence' });
  sizeSlider();
  await wheel(-3, { deltaMode: 1 });
  assert.ok(zoomScale() > 1);
  await pointer('pointerdown', 300);
  await pointer('pointermove', 200);
  await pointer('pointerup', 200);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  await render({ enableZoom: true });
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 200);
  assert.equal((await wheel(-200)).defaultPrevented, false);
  assert.equal(zoomScale(), 1);
  await pointer('pointerup', 200);
  assert.equal((await wheel(-200)).defaultPrevented, false);
  await finishSlide();
  await wheel(-200);
  assert.ok(zoomScale() > 1);
});

test('overlay pointer presses do not capture the pointer or start a slide', async () => {
  await render({ showThumbnails: true });
  sizeSlider();
  const event = new dom.window.Event('pointerdown', { bubbles: true });
  Object.assign(event, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: 300,
    clientY: 0,
  });
  await act(() => button('Next image').dispatchEvent(event));
  assert.equal(captures.has(stage()), false);
  await pointer('pointermove', 100);
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(0px, 0, 0)'
  );
  await click('Next image');
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
});

test('arrows, arbitrary thumbnails, keyboard jumps and wrapping share the slide transition', async () => {
  const changes = [];
  await render({
    showThumbnails: true,
    onFrameChange: (change) => changes.push(change.frameIndex),
  });
  sizeSlider();
  await loadCurrent();
  await finishPreloads();
  for (const [action, target, direction] of [
    [() => click('Next image', false), 1, -1],
    [() => click('exterior 3', false), 3, -1],
    [() => key('Home', false), 0, 1],
    [() => click('Previous image', false), 3, 1],
  ]) {
    const previous = activeImage().getAttribute('src');
    const count = changes.length;
    await action();
    assert.equal(activeImage().getAttribute('src'), previous);
    assert.equal(changes.length, count);
    assert.equal(
      container.querySelector('.civ__slide--neighbor img').getAttribute('src'),
      `/exterior/${target}.webp`
    );
    assert.equal(
      container.querySelector('.civ__track--settling').style.transform,
      `translate3d(${direction * 500}px, 0, 0)`
    );
    assert.ok(container.querySelector('.civ__slide--settling'));
    await finishSlide();
    assert.equal(activeImage().getAttribute('src'), `/exterior/${target}.webp`);
  }
  assert.deepEqual(changes, [1, 3, 0, 3]);
});

test('programmatic transitions stage the incoming parallax before animation and cancel scheduled frames on source changes', async () => {
  const originalRequest = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const scheduled = new Map();
  let id = 0;
  window.requestAnimationFrame = (callback) => {
    scheduled.set(++id, callback);
    return id;
  };
  window.cancelAnimationFrame = (key) => scheduled.delete(key);
  const flush = async () => {
    const [key, callback] = scheduled.entries().next().value;
    scheduled.delete(key);
    await act(() => callback());
  };
  try {
    await render({ showThumbnails: true });
    sizeSlider();
    await click('Next image', false);
    assert.equal(container.querySelector('.civ__track--settling'), null);
    assert.equal(
      container.querySelector('.civ__track').style.transform,
      'translate3d(0px, 0, 0)'
    );
    assert.equal(
      container.querySelector('.civ__slide--neighbor').style.transform,
      'translate3d(clamp(0px, calc(20% + 0px), 20%), 0, 0)'
    );
    await flush();
    assert.equal(container.querySelector('.civ__track--settling'), null);
    await flush();
    assert.equal(
      container.querySelector('.civ__track--settling').style.transform,
      'translate3d(-500px, 0, 0)'
    );
    await finishSlide();
    await click('Next image', false);
    assert.equal(scheduled.size, 1);
    await render({ exteriorFrames: frames('new', 4) });
    assert.equal(scheduled.size, 0);
    assert.equal(container.querySelector('.civ__slide--neighbor'), null);
    assert.equal(activeImage().getAttribute('src'), '/new/1.webp');
  } finally {
    window.requestAnimationFrame = originalRequest;
    window.cancelAnimationFrame = originalCancel;
  }
});

test('rapid arrow presses use the pending destination and accept reversals', async () => {
  const changes = [];
  await render({
    loop: false,
    onFrameChange: (change) => changes.push(change.frameIndex),
  });
  sizeSlider();
  await click('Next image', false);
  assert.equal(button('Previous image').disabled, false);
  await click('Next image', false);
  await click('Previous image', false);
  assert.deepEqual(changes, [1, 2]);
  assert.equal(activeImage().getAttribute('src'), '/exterior/2.webp');
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(500px, 0, 0)'
  );
  await finishSlide();
  assert.deepEqual(changes, [1, 2, 1]);
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
});

test('view-switch thumbnails animate to the remembered camera in both directions', async () => {
  await render({ showThumbnails: true });
  sizeSlider();
  await loadCurrent();
  await finishPreloads();
  await click('Next image');
  await click('Interior', false);
  assert.equal(stage().getAttribute('aria-label'), 'Exterior');
  assert.equal(
    container.querySelector('.civ__slide--neighbor img').getAttribute('src'),
    '/interior/0.webp'
  );
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(-500px, 0, 0)'
  );
  await finishSlide();
  sizeSlider();
  await loadCurrent();
  await finishPreloads();
  await click('Next image');
  await click('Exterior', false);
  assert.equal(stage().getAttribute('aria-label'), 'Interior');
  assert.equal(
    container.querySelector('.civ__slide--neighbor img').getAttribute('src'),
    '/exterior/1.webp'
  );
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(500px, 0, 0)'
  );
  await finishSlide();
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
});

test('animated thumbnail selection remains controlled by the host', async () => {
  const changes = [];
  const props = {
    showThumbnails: true,
    frameIndex: 0,
    onFrameChange: (change) => changes.push(change.frameIndex),
  };
  await render(props);
  sizeSlider();
  await click('exterior 3', false);
  assert.deepEqual(changes, []);
  await finishSlide();
  assert.deepEqual(changes, [3]);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  await render({ ...props, frameIndex: 3 });
  assert.equal(activeImage().getAttribute('src'), '/exterior/3.webp');
});

test('reduced motion skips animations for arrows, thumbnails, keyboard and view switches', async () => {
  const original = window.matchMedia;
  window.matchMedia = () => ({ matches: true });
  try {
    await render({ showThumbnails: true });
    sizeSlider();
    await click('Next image', false);
    assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
    await click('exterior 3', false);
    assert.equal(activeImage().getAttribute('src'), '/exterior/3.webp');
    await key('Home', false);
    assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
    await click('Interior', false);
    assert.equal(activeImage().getAttribute('src'), '/interior/0.webp');
    assert.equal(container.querySelector('.civ__slide--neighbor'), null);
  } finally {
    window.matchMedia = original;
  }
});

test('click navigation gets a longer transition and timeout without slowing drag settling', async () => {
  const changes = [];
  await render({ onFrameChange: (change) => changes.push(change.frameIndex) });
  sizeSlider();
  await click('Next image', false);
  assert.ok(container.querySelector('.civ__track--navigation'));
  assert.ok(container.querySelector('.civ__slide--navigation'));
  await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
  assert.deepEqual(changes, []);
  await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
  assert.deepEqual(changes, [1]);
  await pointer('pointerdown', 300);
  await pointer('pointermove', 200);
  await pointer('pointerup', 200);
  assert.ok(container.querySelector('.civ__track--settling'));
  assert.equal(container.querySelector('.civ__track--navigation'), null);
  await finishSlide();
  assert.deepEqual(changes, [1, 2]);
});

test('default slider reveals a parallax neighbor behind the outgoing foreground', async () => {
  const changes = [];
  await render({ onFrameChange: (change) => changes.push(change) });
  await loadCurrent();
  await finishPreloads();
  sizeSlider();
  assert.equal(container.querySelectorAll('.civ__image').length, 1);
  await pointer('pointerdown', 300);
  await pointer('pointermove', 175);
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(-125px, 0, 0)'
  );
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  assert.equal(changes.length, 0);
  assert.deepEqual(
    [...container.querySelectorAll('.civ__slide--neighbor img')].map((image) =>
      image.getAttribute('src')
    ),
    ['/exterior/1.webp']
  );
  assert.equal(
    container.querySelectorAll('.civ__slide--neighbor[aria-hidden="true"]')
      .length,
    1
  );
  assert.equal(
    container.querySelectorAll('.civ__slide--neighbor button').length,
    0
  );
  assert.equal(
    container.querySelector('.civ__track .civ__slide--neighbor'),
    null
  );
  assert.equal(
    container.querySelector('.civ__slide--neighbor').parentElement,
    container.querySelector('.civ__slider')
  );
  await pointer('pointermove', -1000);
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(-500px, 0, 0)'
  );
  await pointer('pointerup', -1000);
  assert.equal(changes.length, 0);
  await finishSlide();
  await finishSlide();
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  assert.equal(changes.length, 1);
  assert.equal(container.querySelectorAll('.civ__image').length, 1);
});

test('incoming parallax tracks both directions and settles in sync with the foreground', async () => {
  await render();
  sizeSlider();
  await loadCurrent();
  await finishPreloads();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 200);
  const next = container.querySelector('.civ__slide--neighbor');
  assert.equal(
    next.style.transform,
    'translate3d(clamp(0px, calc(20% + -20px), 20%), 0, 0)'
  );
  assert.equal(next.classList.contains('civ__slide--settling'), false);
  await pointer('pointerup', 200);
  assert.equal(
    next.style.transform,
    'translate3d(clamp(0px, calc(20% + -100px), 20%), 0, 0)'
  );
  assert.equal(next.classList.contains('civ__slide--settling'), true);
  await finishSlide();

  await pointer('pointerdown', 200);
  await pointer('pointermove', 300);
  const previous = container.querySelector('.civ__slide--neighbor');
  assert.equal(
    previous.style.transform,
    'translate3d(clamp(-20%, calc(-20% + 20px), 0px), 0, 0)'
  );
  await pointer('pointercancel', 300);
  assert.equal(previous.style.transform, 'translate3d(0px, 0, 0)');
  assert.equal(previous.classList.contains('civ__slide--settling'), true);
  await finishSlide();
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
});

test('reversed parallax targets stay centered while displacement still points the other way', async () => {
  await render();
  sizeSlider();
  await loadCurrent();
  await finishPreloads();
  for (const sign of [-1, 1]) {
    await pointer('pointerdown', 250);
    await pointer('pointermove', 250 + sign * 100);
    await pointer('pointermove', 250 + sign * 80);
    const neighbor = container.querySelector('.civ__slide--neighbor');
    assert.equal(neighbor.style.transform, 'translate3d(0px, 0, 0)');
    await pointer('pointerup', 250 + sign * 80);
    await finishSlide();
    assert.equal(
      activeImage().getAttribute('src'),
      `/exterior/${sign < 0 ? 3 : 0}.webp`
    );
  }
});

test('cancelling a reversed drag keeps the background centered until the foreground returns', async () => {
  await render();
  sizeSlider();
  await pointer('pointerdown', 250);
  await pointer('pointermove', 150);
  await pointer('pointermove', 170);
  const neighbor = container.querySelector('.civ__slide--neighbor');
  assert.equal(neighbor.style.transform, 'translate3d(0px, 0, 0)');
  await pointer('pointercancel', 170);
  assert.equal(neighbor.style.transform, 'translate3d(0px, 0, 0)');
  await finishSlide();
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
});

test('slides work in both directions and wrap in exterior and interior', async () => {
  await render();
  for (const mode of ['Exterior', 'Interior']) {
    await selectView(mode);
    sizeSlider();
    await pointer('pointerdown', 200);
    await pointer('pointermove', 400);
    await pointer('pointerup', 400);
    await finishSlide();
    assert.equal(
      activeImage().getAttribute('src'),
      `/${mode.toLowerCase()}/${mode === 'Exterior' ? 3 : 2}.webp`
    );
    sizeSlider();
    await pointer('pointerdown', 300);
    await pointer('pointermove', 100);
    await pointer('pointerup', 100);
    await finishSlide();
    assert.equal(
      activeImage().getAttribute('src'),
      `/${mode.toLowerCase()}/0.webp`
    );
  }
});

test('click jitter and pointer cancellation do not change cameras', async () => {
  const changes = [];
  await render({ onFrameChange: (change) => changes.push(change) });
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 299);
  await pointer('pointerup', 299);
  await finishSlide();
  for (const end of ['pointercancel']) {
    await pointer('pointerdown', 300);
    await pointer('pointermove', 100);
    await pointer(end, 100);
    await pointer('pointerup', 100);
    await finishSlide();
  }
  assert.equal(changes.length, 0);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(0px, 0, 0)'
  );
});

test('a short directional gesture snaps without a viewport-distance threshold', async () => {
  const changes = [];
  await render({ onFrameChange: (change) => changes.push(change) });
  await loadCurrent();
  await finishPreloads();
  sizeSlider(1000);
  await pointer('pointerdown', 300);
  await pointer('pointermove', 290);
  await pointer('pointerup', 290);
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(-1000px, 0, 0)'
  );
  await finishSlide();
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  sizeSlider(1000);
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  await pointer('pointermove', 310);
  assert.equal(
    container.querySelector('.civ__slide--neighbor img').getAttribute('src'),
    '/exterior/0.webp'
  );
  await pointer('pointerup', 310);
  await finishSlide();
  assert.deepEqual(
    changes.map(({ frameIndex }) => frameIndex),
    [1, 0]
  );
});

test('rapid swipes during settling are all accepted rather than discarded', async () => {
  const changes = [];
  await render({ onFrameChange: ({ frameIndex }) => changes.push(frameIndex) });
  sizeSlider();
  for (let i = 0; i < 3; i++) {
    await pointer('pointerdown', 300);
    await pointer('pointermove', 296);
    await pointer('pointerup', 296);
  }
  await finishSlide();
  assert.deepEqual(changes, [1, 2, 3]);
  assert.equal(activeImage().getAttribute('src'), '/exterior/3.webp');
});

test('release-only movement, capture loss and a reverse flick all commit a swipe', async () => {
  const changes = [];
  await render({ onFrameChange: ({ frameIndex }) => changes.push(frameIndex) });
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointerup', 290);
  await finishSlide();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 290);
  await pointer('lostpointercapture', 0);
  await finishSlide();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 280);
  await pointer('pointermove', 300);
  await pointer('pointerup', 300);
  await finishSlide();
  assert.deepEqual(changes, [1, 2, 1]);
});

test('non-looping slides clamp at edges and controlled selection remains host-owned', async () => {
  const changes = [];
  const props = {
    loop: false,
    frameIndex: 0,
    onFrameChange: (change) => changes.push(change),
  };
  await render(props);
  sizeSlider();
  await pointer('pointerdown', 200);
  await pointer('pointermove', 400);
  assert.equal(
    container.querySelector('.civ__track').style.transform,
    'translate3d(0px, 0, 0)'
  );
  await pointer('pointerup', 400);
  await finishSlide();
  assert.equal(changes.length, 0);
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  await pointer('pointerup', 100);
  await finishSlide();
  assert.equal(changes[0].frameIndex, 1);
  assert.equal(activeImage().getAttribute('src'), '/exterior/0.webp');
  await render({ ...props, frameIndex: 1 });
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  await render({ ...props, frameIndex: 3 });
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  await pointer('pointerup', 100);
  await finishSlide();
  assert.equal(changes.length, 1);
});

test('source and mode changes cancel stale selections but resize preserves a released swipe', async () => {
  const changes = [];
  const onFrameChange = (change) => changes.push(change);
  await render({ onFrameChange });
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  await pointer('pointerup', 100);
  await render({ onFrameChange, exteriorFrames: frames('updated', 4) });
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  await pointer('pointerup', 100);
  await render({
    onFrameChange,
    exteriorFrames: frames('updated', 4),
    viewMode: 'interior',
  });
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  await pointer('pointerup', 100);
  await act(() => window.dispatchEvent(new dom.window.Event('resize')));
  await act(() => new Promise((resolve) => setTimeout(resolve, 280)));
  assert.equal(changes.length, 1);
  assert.equal(activeImage().getAttribute('src'), '/interior/1.webp');
});

test('slide selection has a timer fallback and respects reduced motion', async () => {
  await render();
  sizeSlider();
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  await pointer('pointerup', 100);
  await act(() => new Promise((resolve) => setTimeout(resolve, 280)));
  assert.equal(activeImage().getAttribute('src'), '/exterior/1.webp');
  sizeSlider();
  const original = window.matchMedia;
  window.matchMedia = () => ({ matches: true });
  try {
    await pointer('pointerdown', 300);
    await pointer('pointermove', 100);
    await pointer('pointerup', 100);
    assert.equal(activeImage().getAttribute('src'), '/exterior/2.webp');
  } finally {
    window.matchMedia = original;
  }
});

test('zero- and one-frame sliders never mount neighbors or capture a drag', async () => {
  for (const count of [0, 1]) {
    await render({
      exteriorFrames: frames('exterior', count),
      interiorFrames: [],
    });
    sizeSlider();
    await pointer('pointerdown', 300);
    await pointer('pointermove', 100);
    await pointer('pointerup', 100);
    assert.equal(container.querySelectorAll('.civ__slide--neighbor').length, 0);
    assert.equal(container.querySelector('.civ__track--settling'), null);
  }
});

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
  await render({ pixelsPerFrame: 20, dragMode: 'sequence' });
  for (const mode of ['Exterior', 'Interior']) {
    await selectView(mode);
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
  sizeSlider();
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

test('empty selections show status and a single available view is selected without navigation', async () => {
  await render({ exteriorFrames: [], interiorFrames: [] });
  assert.match(container.textContent, /No images available/);
  assert.equal(button('Next image'), undefined);
  assert.equal(container.querySelector('output').textContent, '0 / 0');
  await key('End');
  await render({ exteriorFrames: [], interiorFrames: frames('interior', 1) });
  assert.equal(stage().getAttribute('aria-label'), 'Interior');
  assert.equal(button('Next image'), undefined);
  assert.equal(button('Previous image'), undefined);
  assert.equal(container.querySelector('.civ__view-thumbnail'), null);
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
  await render({ preloadRadius: 1 });
  assert.deepEqual(preloaded, []);
  await loadCurrent();
  assert.deepEqual(preloaded, ['/exterior/3.webp', '/exterior/1.webp']);
  await finishPreloads();
  assert.deepEqual(preloaded, ['/exterior/3.webp', '/exterior/1.webp']);
  preloaded.length = 0;
  await render({ preloadRadius: 0 });
  await click('Interior');
  await loadCurrent();
  assert.deepEqual(preloaded, []);
  await render({ preloadRadius: 4 });
  assert.deepEqual(preloaded, ['/interior/2.webp', '/interior/1.webp']);
  await finishPreloads();
  assert.deepEqual(preloaded, ['/interior/2.webp', '/interior/1.webp']);
});

test('configuration loading gates thumbnails and slide previews behind the active image', async () => {
  const makeFrames = (prefix) =>
    frames(prefix, 7).map((frame) => ({
      ...frame,
      thumbnailSrc: frame.src,
    }));
  const props = {
    exteriorFrames: makeFrames('old'),
    defaultFrameIndex: 3,
    showThumbnails: true,
  };
  await render(props);
  sizeSlider();
  assert.equal(activeImage().getAttribute('src'), '/old/3.webp');
  assert.equal(container.querySelectorAll('.civ__thumbnails img').length, 0);
  await pointer('pointerdown', 300);
  await pointer('pointermove', 290);
  assert.equal(container.querySelector('.civ__slide--neighbor img'), null);
  assert.deepEqual(preloaded, []);
  await pointer('pointercancel', 290);
  await finishSlide();
  await loadCurrent();
  assert.deepEqual(preloaded, ['/old/2.webp', '/old/4.webp']);
  const stale = preloadImages[0].onload;
  await render({ ...props, exteriorFrames: makeFrames('new') });
  assert.equal(preloadImages[0].cancelled, true);
  assert.equal(preloadImages[1].cancelled, true);
  assert.equal(activeImage().getAttribute('src'), '/new/3.webp');
  await act(() => stale());
  assert.deepEqual(preloaded, ['/old/2.webp', '/old/4.webp']);
  assert.equal(container.querySelectorAll('.civ__thumbnails img').length, 1);
  assert.equal(
    container.querySelector('.civ__thumbnails img').getAttribute('src'),
    '/old/3.webp'
  );
  await loadCurrent();
  assert.deepEqual(preloaded, [
    '/old/2.webp',
    '/old/4.webp',
    '/new/2.webp',
    '/new/4.webp',
  ]);
  await act(() => preloadImages[3].onload());
  assert.deepEqual(preloaded, [
    '/old/2.webp',
    '/old/4.webp',
    '/new/2.webp',
    '/new/4.webp',
  ]);
  await finishPreloads();
  assert.deepEqual(preloaded, [
    '/old/2.webp',
    '/old/4.webp',
    '/new/2.webp',
    '/new/4.webp',
    '/new/1.webp',
    '/new/5.webp',
    '/new/0.webp',
    '/new/6.webp',
    '/interior/2.webp',
  ]);
  assert.equal(container.querySelectorAll('.civ__thumbnails img').length, 8);
});

test('old frame and thumbnails stay visible under a veil until their replacements load', async () => {
  const makeFrames = (prefix) =>
    frames(prefix, 4).map((frame) => ({
      ...frame,
      thumbnailSrc: frame.src,
    }));
  await render({ exteriorFrames: makeFrames('old'), showThumbnails: true });
  await loadCurrent();
  await finishPreloads();
  const oldImage = activeImage();
  await render({ exteriorFrames: makeFrames('new'), showThumbnails: true });
  assert.equal(container.querySelector('.civ__image--retained'), oldImage);
  assert.equal(oldImage.style.visibility, 'visible');
  assert.equal(activeImage().style.visibility, 'hidden');
  assert.ok(container.querySelector('.civ__track .civ__loading-veil'));
  assert.equal(
    container.querySelectorAll('.civ__thumbnails .civ__loading-veil').length,
    4
  );
  await loadCurrent();
  assert.equal(container.querySelector('.civ__image--retained'), oldImage);
  await act(() => {
    const event = new dom.window.Event('transitionend', { bubbles: true });
    Object.assign(event, { propertyName: 'opacity' });
    activeImage().dispatchEvent(event);
  });
  assert.equal(container.querySelector('.civ__image--retained'), null);
  assert.equal(container.querySelector('.civ__track .civ__loading-veil'), null);
  assert.equal(activeImage().getAttribute('src'), '/new/0.webp');
  await finishPreloads();
  assert.equal(container.querySelectorAll('.civ__loading-veil').length, 0);
});

test('failed replacements preserve the old image and can be retried', async () => {
  await render();
  await loadCurrent();
  const oldImage = activeImage();
  await render({ exteriorFrames: frames('new', 4) });
  await act(() => activeImage().dispatchEvent(new dom.window.Event('error')));
  assert.equal(container.querySelector('.civ__image--retained'), oldImage);
  assert.ok(container.querySelector('[role="alert"]'));
  await click('Retry');
  assert.equal(container.querySelector('.civ__image--retained'), oldImage);
  await loadCurrent();
  assert.equal(container.querySelector('.civ__image--retained'), oldImage);
  await act(() => {
    const event = new dom.window.Event('transitionend', { bubbles: true });
    Object.assign(event, { propertyName: 'opacity' });
    activeImage().dispatchEvent(event);
  });
  assert.equal(container.querySelector('.civ__image--retained'), null);
  assert.equal(activeImage().getAttribute('src'), '/new/0.webp');
});

test('camera thumbnails are opt-in, prefer small sources, and fall back to ready frames', async () => {
  await render();
  assert.equal(container.querySelectorAll('.civ__thumbnails button').length, 1);
  assert.equal(
    container.querySelector('.civ__view-thumbnail').getAttribute('aria-label'),
    'Interior'
  );
  await render({
    exteriorFrames: [
      { src: '/full.webp', thumbnailSrc: '/thumb.webp' },
      { src: '/other.webp' },
    ],
    showThumbnails: true,
    labels: { next: 'Weiter', exterior: 'Exterieur' },
  });
  const thumbnails = container.querySelector('.civ__thumbnails');
  assert.equal(thumbnails.querySelector('img'), null);
  await loadCurrent();
  await finishPreloads();
  assert.equal(
    thumbnails.querySelector('img').getAttribute('src'),
    '/thumb.webp'
  );
  assert.equal(thumbnails.querySelector('img').getAttribute('loading'), 'lazy');
  assert.equal(thumbnails.querySelectorAll('img').length, 3);
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
        React.createElement(ImageFrameViewer, defaults),
        React.createElement(ImageFrameViewer, defaults)
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
    React.createElement(ImageFrameViewer, defaults)
  );
  document.body.append(container);
  const errors = [];
  await act(() => {
    root = hydrateRoot(
      container,
      React.createElement(ImageFrameViewer, defaults),
      { onRecoverableError: (error) => errors.push(error) }
    );
  });
  assert.deepEqual(errors, []);
  await click('Interior');
  await click('Next image');
  assert.equal(activeImage().getAttribute('src'), '/interior/1.webp');
});

const renderDefaults = {
  baseUrl: '/renders',
  configuration: {
    B: '01',
    M: '01',
    P: '070707',
    PMV: '100',
    AKZ: '01',
    AKZI: '02',
    DHC: '03',
  },
  exteriorCameras: [
    { id: 'C360_001', label: 'Front' },
    { id: 'C360_002', label: 'Side' },
    { id: 'C360_003', label: 'Rear' },
  ],
  interiorCameras: [
    { id: 'CINT_DASH', label: 'Dashboard' },
    { id: 'CINT_SEAT', label: 'Seats' },
    { id: 'CINT_DOOR', label: 'Door' },
  ],
};
const exteriorCode = 'B01_M01_P070707_PMV100_AKZ01';
const interiorCode = 'B01_M01_P070707_PMV100_AKZI02_DHC03';

async function renderConfiguration(props = {}) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }

  await act(() =>
    root.render(
      React.createElement(CigsViewer, {
        ...renderDefaults,
        ...props,
      })
    )
  );
}

test('public viewer navigates the full default camera order without camera props', async () => {
  await renderConfiguration({
    exteriorCameras: undefined,
    interiorCameras: undefined,
  });
  for (const [mode, code, ids] of [
    ['Exterior', exteriorCode, ['C1', 'C2', 'C3', 'C4', 'C5', 'C9', 'C10']],
    ['Interior', interiorCode, ['C6', 'C7', 'C8', 'C11', 'C12', 'C13', 'C14']],
  ]) {
    await selectView(mode);
    for (const id of ids) {
      assert.equal(
        activeImage().getAttribute('src'),
        `/renders/${code}_${id}_PQM-FHD.webp`
      );
      await click('Next image');
    }
    assert.equal(
      activeImage().getAttribute('src'),
      `/renders/${code}_${ids[0]}_PQM-FHD.webp`
    );
  }
});

test('public API builds both camera sequences from configuration, including swiping and preloading', async () => {
  const changes = [];
  await renderConfiguration({
    pixelsPerFrame: 20,
    dragMode: 'sequence',
    onFrameChange: (change) => changes.push(change),
  });
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${exteriorCode}_C360_001_PQM-FHD.webp`
  );
  assert.equal(activeImage().alt, 'Front');
  assert.deepEqual(preloaded, []);
  await loadCurrent();
  await finishPreloads();
  assert.deepEqual(preloaded, [
    `/renders/${exteriorCode}_C360_003_PQM-FHD.webp`,
    `/renders/${exteriorCode}_C360_002_PQM-FHD.webp`,
  ]);
  await pointer('pointerdown', 100);
  await pointer('pointermove', 80);
  await pointer('pointerup', 80);
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${exteriorCode}_C360_002_PQM-FHD.webp`
  );
  await click('Interior');
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${interiorCode}_CINT_DASH_PQM-FHD.webp`
  );
  await pointer('pointerdown', 100);
  await pointer('pointermove', 80);
  await pointer('pointerup', 80);
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${interiorCode}_CINT_SEAT_PQM-FHD.webp`
  );
  assert.equal(activeImage().alt, 'Seats');
  assert.deepEqual(
    changes.map(({ viewMode, frame }) => [viewMode, frame.cameraId]),
    [
      ['exterior', 'C360_002'],
      ['interior', 'CINT_SEAT'],
    ]
  );
  await click('Exterior');
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${exteriorCode}_C360_002_PQM-FHD.webp`
  );
});

test('configuration and quality updates rebuild current, neighbor and thumbnail paths without resetting the frame', async () => {
  await renderConfiguration({
    showThumbnails: true,
    thumbnailQuality: 'FHD',
    quality: '4K',
  });
  await click('Next image');
  const previousImage = activeImage();
  preloaded.length = 0;
  await renderConfiguration({
    configuration: { ...renderDefaults.configuration, P: 'FFFFFF' },
    showThumbnails: true,
    thumbnailQuality: 'WQHD',
    quality: '8K',
  });
  const code = 'B01_M01_PFFFFFF_PMV100_AKZ01';
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${code}_C360_002_PQM-8K.webp`
  );
  assert.deepEqual(preloaded, []);
  assert.equal(container.querySelector('.civ__thumbnails img'), null);
  await act(() => previousImage.dispatchEvent(new dom.window.Event('load')));
  assert.match(
    container.querySelector('[role="status"]').textContent,
    /Loading/
  );
  await loadCurrent();
  assert.deepEqual(preloaded, [
    `/renders/${code}_C360_001_PQM-8K.webp`,
    `/renders/${code}_C360_003_PQM-8K.webp`,
  ]);
  await act(() => preloadImages[0].onload());
  assert.equal(preloaded.length, 2);
  assert.equal(container.querySelector('.civ__thumbnails img'), null);
  await act(() => preloadImages[1].onload());
  assert.deepEqual(preloaded, [
    `/renders/${code}_C360_001_PQM-8K.webp`,
    `/renders/${code}_C360_003_PQM-8K.webp`,
    `/renders/${code}_C360_001_PQM-WQHD.webp`,
  ]);
  await finishPreloads();
  assert.deepEqual(preloaded, [
    `/renders/${code}_C360_001_PQM-8K.webp`,
    `/renders/${code}_C360_003_PQM-8K.webp`,
    `/renders/${code}_C360_001_PQM-WQHD.webp`,
    `/renders/${code}_C360_002_PQM-WQHD.webp`,
    `/renders/${code}_C360_003_PQM-WQHD.webp`,
    '/renders/B01_M01_PFFFFFF_PMV100_AKZI02_DHC03_CINT_DASH_PQM-WQHD.webp',
  ]);
  assert.equal(
    container.querySelector('.civ__thumbnails img').getAttribute('src'),
    `/renders/${code}_C360_001_PQM-WQHD.webp`
  );
  await click('Interior');
  assert.equal(
    activeImage().getAttribute('src'),
    '/renders/B01_M01_PFFFFFF_PMV100_AKZI02_DHC03_CINT_DASH_PQM-8K.webp'
  );
});

test('cameraId controls selection and callbacks identify the requested camera', async () => {
  const changes = [];
  const modes = [];
  await renderConfiguration({
    viewMode: 'exterior',
    cameraId: 'C360_002',
    onFrameChange: (change) => changes.push(change),
    onViewModeChange: (mode) => modes.push(mode),
  });
  await click('Next image');
  assert.equal(changes[0].frame.cameraId, 'C360_003');
  assert.equal(changes[0].frameIndex, 2);
  assert.equal(activeImage().alt, 'Side');
  await click('Interior');
  assert.deepEqual(modes, ['interior']);
  await renderConfiguration({ viewMode: 'interior', cameraId: 'CINT_DOOR' });
  assert.equal(activeImage().alt, 'Door');
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${interiorCode}_CINT_DOOR_PQM-FHD.webp`
  );
});

test('errors report the generated URL and camera and retry the same configuration', async () => {
  const errors = [];
  await renderConfiguration({
    defaultViewMode: 'interior',
    onImageError: (error, change) => errors.push({ error, change }),
  });
  await act(() => activeImage().dispatchEvent(new dom.window.Event('error')));
  assert.equal(errors[0].change.frame.cameraId, 'CINT_DASH');
  assert.equal(
    errors[0].change.frame.src,
    `/renders/${interiorCode}_CINT_DASH_PQM-FHD.webp`
  );
  await click('Retry');
  assert.equal(activeImage().getAttribute('src'), errors[0].change.frame.src);
  await act(() => activeImage().dispatchEvent(new dom.window.Event('load')));
  assert.equal(container.querySelector('[role="alert"]'), null);
});

test('empty camera sets and custom render-code filters are supported by the public API', async () => {
  await renderConfiguration({
    exteriorCameras: [],
    omittedConfigurationKeys: { interior: [] },
  });
  assert.equal(stage().getAttribute('aria-label'), 'Interior');
  assert.equal(container.querySelector('.civ__view-thumbnail'), null);
  assert.equal(
    activeImage().getAttribute('src'),
    '/renders/B01_M01_P070707_PMV100_AKZ01_AKZI02_DHC03_CINT_DASH_PQM-FHD.webp'
  );
});

test('common camera selection handles single views, both views and no cameras without unavailable controls', async () => {
  const props = {
    exteriorCameras: undefined,
    interiorCameras: undefined,
    showThumbnails: true,
  };
  await renderConfiguration({ ...props, cameras: ['C1'] });
  assert.equal(stage().getAttribute('aria-label'), 'Exterior');
  assert.match(activeImage().getAttribute('src'), /_C1_PQM-FHD/);
  assert.equal(button('Next image'), undefined);
  assert.equal(container.querySelector('.civ__view-thumbnail'), null);
  assert.equal(container.querySelector('.civ__thumbnails'), null);
  await renderConfiguration({ ...props, cameras: ['C6'] });
  assert.equal(stage().getAttribute('aria-label'), 'Interior');
  assert.match(activeImage().getAttribute('src'), /_C6_PQM-FHD/);
  assert.equal(button('Previous image'), undefined);
  assert.equal(container.querySelector('.civ__view-thumbnail'), null);
  assert.equal(container.querySelector('.civ__thumbnails'), null);
  await renderConfiguration({ ...props, cameras: ['C1', 'C6'] });
  assert.equal(button('Previous image'), undefined);
  assert.equal(container.querySelectorAll('.civ__view-thumbnail').length, 1);
  assert.equal(container.querySelectorAll('.civ__thumbnails button').length, 1);
  await click('Exterior');
  assert.equal(button('Next image'), undefined);
  assert.equal(button('Interior').disabled, false);
  assert.equal(container.querySelectorAll('.civ__thumbnails button').length, 1);
  await renderConfiguration({ ...props, cameras: ['C1', 'C2'] });
  assert.equal(container.querySelectorAll('.civ__thumbnails button').length, 2);
  await renderConfiguration({ ...props, cameras: ['C1'] });
  assert.equal(container.querySelector('.civ__thumbnails'), null);
  await renderConfiguration({ ...props, cameras: [], showThumbnails: false });
  assert.match(container.textContent, /No images available/);
  assert.equal(container.querySelector('.civ__thumbnails'), null);
  assert.equal(container.querySelector('.civ__navigation button'), null);
});

test('a single selected camera cannot swipe in either interaction mode', async () => {
  for (const dragMode of ['slide', 'sequence']) {
    await renderConfiguration({
      exteriorCameras: undefined,
      interiorCameras: undefined,
      cameras: ['C1'],
      dragMode,
    });
    sizeSlider();
    const image = activeImage();
    await pointer('pointerdown', 300);
    await pointer('pointermove', 0);
    await pointer('pointerup', 0);
    await key('ArrowRight');
    assert.equal(captures.has(stage()), false);
    assert.equal(activeImage(), image);
    assert.equal(container.querySelector('.civ__slide--neighbor'), null);
    assert.ok(stage().classList.contains('civ__stage--static'));
  }
});

test('single-camera thumbnails are not preloaded but the alternate view thumbnail remains available', async () => {
  const exteriorFrames = [
    { cameraId: 'C1', src: '/single.webp', thumbnailSrc: '/single-thumb.webp' },
  ];
  await render({ exteriorFrames, interiorFrames: [], showThumbnails: true });
  await loadCurrent();
  assert.deepEqual(preloaded, []);
  await render({
    exteriorFrames,
    interiorFrames: [
      {
        cameraId: 'C6',
        src: '/interior.webp',
        thumbnailSrc: '/interior-thumb.webp',
      },
    ],
    showThumbnails: true,
  });
  await loadCurrent();
  assert.deepEqual(preloaded, ['/interior-thumb.webp']);
  assert.equal(container.querySelectorAll('.civ__thumbnails button').length, 1);
  assert.equal(button('Interior').disabled, false);
});

test('public camera selection produces only the selected 4K upgrade on zoom', async () => {
  await renderConfiguration({
    exteriorCameras: undefined,
    interiorCameras: undefined,
    cameras: ['C6'],
    enableZoom: true,
  });
  sizeSlider();
  assert.equal(container.querySelector('.civ__zoom-quality'), null);
  await loadCurrent();
  const base = activeImage();
  await wheel(-200);
  const sharp = container.querySelector('.civ__zoom-quality img');
  assert.equal(
    sharp.getAttribute('src'),
    `/renders/${interiorCode}_C6_PQM-4K.webp`
  );
  assert.equal(activeImage(), base);
  assert.equal(base.style.visibility, 'visible');
  assert.deepEqual(preloaded, []);
  await act(() => sharp.dispatchEvent(new dom.window.Event('load')));
  assert.equal(sharp.style.visibility, 'visible');
});

test('configuration-driven public entry hydrates and navigates without mismatches', async () => {
  container = document.createElement('div');
  container.innerHTML = renderToString(
    React.createElement(CigsViewer, renderDefaults)
  );
  document.body.append(container);
  const errors = [];
  await act(() => {
    root = hydrateRoot(
      container,
      React.createElement(CigsViewer, renderDefaults),
      {
        onRecoverableError: (error) => errors.push(error),
      }
    );
  });
  assert.deepEqual(errors, []);
  await click('Interior');
  await key('End');
  assert.equal(
    activeImage().getAttribute('src'),
    `/renders/${interiorCode}_CINT_DOOR_PQM-FHD.webp`
  );
});
