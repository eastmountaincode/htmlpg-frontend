import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDisplayHealth } from '../src/lib/display-health.ts';

test('legacy and invalid display reports remain optional', () => {
  for (const value of [undefined, null, [], 'healthy', {state: 'visually_verified'}]) {
    assert.equal(normalizeDisplayHealth(value), undefined);
  }
});

test('failure and subsequent recovery retain the useful controller evidence', () => {
  const failed = {state:'retry_wait', pending:true, failures:1, consecutiveFailures:1, refreshes:2, retryInMs:60000, lastError:'refresh_timeout'};
  assert.deepEqual(normalizeDisplayHealth(failed), failed);
  const recovered = {...failed, state:'controller_ok', pending:false, consecutiveFailures:0, refreshes:3, retryInMs:0, lastRefreshAgoMs:0};
  assert.deepEqual(normalizeDisplayHealth(recovered), recovered);
});

test('untrusted telemetry cannot add fields or invalid counters', () => {
  assert.deepEqual(normalizeDisplayHealth({state:'controller_ok', refreshes:-1, failures:Infinity, retryInMs:1.5, pending:'false', arbitrary:'discard', lastError:'x'.repeat(100)}), {
    state:'controller_ok', lastError:'x'.repeat(80)
  });
});
