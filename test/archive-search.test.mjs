import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { searchArchive } = new Function(`${fs.readFileSync(new URL('../src/shared.js', import.meta.url), 'utf8')}; return { searchArchive };`)();
const story = (title, extra = {}) => ({ title, summary: '', source: 'Example', topic: '', region: '', date: '2026-10-20T10:00:00Z', ...extra });

test('natural-language questions require all meaningful keywords', () => {
  const partial = story('Hydrogen project in Spain');
  const complete = story('German hydrogen project approved');
  const { terms, results } = searchArchive([partial, complete], 'What hydrogen projects were announced in Germany?');
  assert.deepEqual(terms, ['hydrogen', 'project', 'germany']);
  assert.equal(results[0].article, complete);
  assert.equal(results[0].matched.length, 3);
  assert.equal(results.length, 1);
});

test('eSAF and e-SAF are equivalent but a match for only one keyword is not returned', () => {
  const both = story('Germany backs e-SAF production');
  const onlyGermany = story('Germany plans a hydrogen plant');
  const onlyEsaf = story('eSAF deal in Denmark');
  const { results } = searchArchive([both, onlyGermany, onlyEsaf], 'eSAF Germany');
  assert.deepEqual(results.map(r => r.article), [both]);
  assert.equal(searchArchive([onlyGermany], 'eSAF Germany').results.length, 0);
});

test('matches translated and original headlines and summaries without using inferred regions', () => {
  const a = story('Wasserstoffprojekt in Essen', { titleEn: 'German hydrogen project in Essen', summary: 'Arcadia deal', region: 'Germany' });
  assert.equal(searchArchive([a], 'Arcadia Germany').results.length, 1);
  assert.equal(searchArchive([a], 'Wasserstoffprojekt').results.length, 1);
  assert.equal(searchArchive([a], 'hydro').results.length, 0);
  assert.equal(searchArchive([story('eSAF project', { region: 'Germany', source: 'News Germany' })], 'eSAF Germany').results.length, 0);
});

test('handles empty, generic, unmatched and repeated keywords', () => {
  const items = [story('Hydrogen project')];
  assert.deepEqual(searchArchive(items, 'what are the latest news?'), { terms: [], results: [] });
  assert.deepEqual(searchArchive(items, 'ammonia').results, []);
  assert.deepEqual(searchArchive(items, 'hydrogen hydrogen').terms, ['hydrogen']);
});

test('breaks equal-match ties by headline match and then recency', () => {
  const summary = story('Another story', { summary: 'pipeline', date: '2026-10-22T00:00:00Z' });
  const old = story('Pipeline update', { date: '2026-10-20T00:00:00Z' });
  const recent = story('Pipeline agreement', { date: '2026-10-21T00:00:00Z' });
  assert.deepEqual(searchArchive([summary, old, recent], 'pipeline').results.map(r => r.article), [recent, old, summary]);
});
