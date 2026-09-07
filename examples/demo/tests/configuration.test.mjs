import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseConfiguration } from '../dist/tests/configuration.js';

function entries(pairs) {
  return pairs.map(([key, value], id) => ({ id, key, value }));
}

test('configuration preserves key order, zero and leading zeroes', () => {
  const result = parseConfiguration(
    entries([
      ['B', '01'],
      ['M', '01'],
      ['P', '070707'],
      ['PMV', '0'],
    ])
  );
  assert.equal(result.error, null);
  assert.deepEqual(Object.entries(result.configuration), [
    ['B', '01'],
    ['M', '01'],
    ['P', '070707'],
    ['PMV', '0'],
  ]);
});

test('adding, editing and deleting rows produces exactly the remaining pairs', () => {
  const original = entries([
    ['B', '01'],
    ['M', '01'],
  ]);
  const changed = [
    { ...original[0], value: '02' },
    { id: 2, key: 'PMV', value: '100' },
  ];
  assert.deepEqual(parseConfiguration(changed).configuration, {
    B: '02',
    PMV: '100',
  });
  assert.equal(original[0].value, '01');
});

test('empty lists and incomplete rows are rejected instead of silently discarded', () => {
  for (const input of [[], entries([['', '01']]), entries([['B', '']])]) {
    const result = parseConfiguration(input);
    assert.equal(result.configuration, null);
    assert.ok(result.error);
  }
});

test('duplicate keys are rejected instead of overwriting an earlier value', () => {
  const result = parseConfiguration(
    entries([
      ['B', '01'],
      ['B', '02'],
    ])
  );
  assert.equal(result.configuration, null);
  assert.match(result.error, /doppelt/);
});

test('unsafe filename tokens are rejected in keys and values', () => {
  for (const token of ['../', 'B 01', 'x?y', '#fff', 'A&B', 'B\n']) {
    for (const pair of [
      [token, '01'],
      ['B', token],
    ]) {
      const result = parseConfiguration(entries([pair]));
      assert.equal(result.configuration, null);
      assert.ok(result.error);
    }
  }
});

test('configuration is created safely even for object property names', () => {
  const result = parseConfiguration(
    entries([
      ['__proto__', '01'],
      ['constructor', '02'],
    ])
  );
  assert.equal(Object.getPrototypeOf(result.configuration), Object.prototype);
  assert.deepEqual(Object.entries(result.configuration), [
    ['__proto__', '01'],
    ['constructor', '02'],
  ]);
});
