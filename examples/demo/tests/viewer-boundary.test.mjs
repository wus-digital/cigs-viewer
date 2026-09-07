import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ViewerErrorBoundary } from '../dist/tests/components/ViewerErrorBoundary.js';

test('configuration changes preserve the viewer instance while errors remain recoverable', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.getElementById('root');
  const errors = [];
  const root = createRoot(container, {
    onCaughtError: (error) => errors.push(error),
  });
  let mounts = 0;
  function Viewer({ broken }) {
    useEffect(() => {
      mounts++;
    }, []);
    if (broken) throw new Error('Invalid configuration');
    return createElement('span', { className: 'viewer' }, 'Viewer');
  }
  const render = (resetKey, broken = false) =>
    act(() =>
      root.render(
        createElement(
          ViewerErrorBoundary,
          { resetKey },
          createElement(Viewer, { broken })
        )
      )
    );
  try {
    await render('first');
    const viewer = container.querySelector('.viewer');
    await render('second');
    assert.equal(mounts, 1);
    assert.equal(container.querySelector('.viewer'), viewer);
    await render('invalid', true);
    assert.match(
      container.querySelector('[role="alert"]').textContent,
      /Invalid configuration/
    );
    assert.equal(errors.length, 1);
    await render('corrected');
    assert.equal(container.querySelector('[role="alert"]'), null);
    assert.equal(mounts, 2);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
