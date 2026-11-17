import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAllById, classifyAdminInventory, loadAdminInventory } from '../lib/adminInventory.ts';

test('keyset pagination returns every row beyond 1,000, including lower server caps', async () => {
  for (const total of [0, 1, 999, 1000, 1001, 1043, 25000]) {
    for (const cap of [137, 1000]) {
      const source = Array.from({ length: total }, (_, i) => ({ id: i * 3 + 2 }));
      const actual = await fetchAllById(async after => ({
        data: source.filter(r => after === null || r.id > after).slice(0, cap), error: null,
      }));
      assert.deepEqual(actual, source);
    }
  }
});

test('errors and non-advancing pages never masquerade as complete results', async () => {
  await assert.rejects(() => fetchAllById(async after => after === null
    ? { data: [{ id: 1 }], error: null }
    : { data: null, error: new Error('page failed') }), /page failed/);
  await assert.rejects(() => fetchAllById(async () => ({ data: [{ id: 1 }], error: null })), /did not advance/);
});

test('classification preserves hidden/live rules and counts only unpublished non-hidden submissions', () => {
  const polls = Array.from({ length: 3005 }, (_, i) => ({ id: i + 1, slug: String(i + 1), is_publicly_listed: true }));
  polls[3000].is_publicly_listed = false;
  polls[3001].is_publicly_listed = false;
  const submissions = [
    { id: 1, poll_id: 2999, status: 'ready' },
    { id: 2, poll_id: 3000, status: 'hidden' },
    { id: 3, poll_id: 3001, status: 'scheduled' },
    { id: 4, poll_id: 3002, status: 'pending' },
    { id: 5, poll_id: null, status: 'scheduled' },
  ];
  const actual = classifyAdminInventory(polls, submissions);
  assert.equal(actual.submissionCount, 3);
  assert.equal(actual.liveIds.size, 3002);
  assert.ok(actual.liveIds.has(2999));
  assert.ok(!actual.liveIds.has(3000));
  assert.ok(!actual.liveIds.has(3001));
  assert.deepEqual(submissions.filter(actual.isQueued).map(s => s.id), [3, 4, 5]);
});

test('shared inventory loader paginates BOTH tables, not only polls', async () => {
  const polls = Array.from({ length: 4501 }, (_, i) => ({ id: i + 1, slug: String(i + 1), is_publicly_listed: i < 2500 }));
  const submissions = Array.from({ length: 4501 }, (_, i) => ({ id: i + 1, poll_id: i + 1, status: 'scheduled' }));
  const tables = { polls, poll_submissions: submissions };
  const client = { from(table) {
    let after = null;
    const query = {
      select() { return this; }, order() { return this; }, limit() { return this; },
      gt(key, value) { assert.equal(key, 'id'); after = value; return this; },
      then(resolve) { return Promise.resolve({ data: tables[table].filter(r => after === null || r.id > after).slice(0, 333), error: null }).then(resolve); },
    };
    return query;
  } };
  const result = await loadAdminInventory(client);
  assert.equal(result.polls.length, 4501);
  assert.equal(result.submissions.length, 4501);
  assert.equal(result.submissionCount, 2001);
  assert.equal(result.liveIds.size, 2500);
});
