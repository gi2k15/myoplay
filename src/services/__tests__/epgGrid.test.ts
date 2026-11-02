import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideBlock } from '../../utils/epgGrid.ts';

const MIN = 60000;

test('guide blocks are clipped to the window and skipped outside it', () => {
  assert.deepEqual(guideBlock(10 * MIN, 40 * MIN, 0, 60 * MIN, 4), { left: 40, width: 120 });
  assert.deepEqual(guideBlock(-30 * MIN, 15 * MIN, 0, 60 * MIN, 4), { left: 0, width: 60 });
  assert.deepEqual(guideBlock(50 * MIN, 90 * MIN, 0, 60 * MIN, 4), { left: 200, width: 40 });
  assert.equal(guideBlock(60 * MIN, 90 * MIN, 0, 60 * MIN, 4), null);
});
