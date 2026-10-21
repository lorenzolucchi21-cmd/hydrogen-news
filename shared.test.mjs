import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const S = new Function(`${fs.readFileSync(new URL('../src/shared.js', import.meta.url), 'utf8')}; return { prepare, dedupe, windowStart, canonicalUrl, TOPICS };`)();
const item = (title, extra = {}) => ({ title, summary: '', link: 'https://example.com/' + encodeURIComponent(title), date: '2026-10-20T10:00:00Z', source: 'Example', ...extra });

test('keeps commercially relevant hydrogen news and drops weak, off-topic or event items', () => {
  assert.ok(S.prepare(item('RWE takes final investment decision on 300 MW electrolyser')));
  assert.equal(S.prepare(item('Solar farm signs contract for 300 MW')), null);
  assert.equal(S.prepare(item('Hydrogen science discovery')), null);
  assert.equal(S.prepare(item('Hydrogen conference announces investment webinar')), null);
  assert.equal(S.prepare(item('Hydrogen project link', { link: 'javascript:alert(1)' })), null);
  assert.equal(S.prepare(item('Hydrogen contract', { date: 'not a date' })), null);
});

test('assigns topics and regions in the original order', () => {
  const a = S.prepare(item('Hydrogen offtake agreement signed in Rotterdam for 100 MW'));
  assert.equal(a.topic, 'Offtake & Supply');
  assert.equal(a.region, 'Benelux');
  assert.equal(S.prepare(item('Hydrogen pipeline financing in Germany, €200 million')).topic, 'Investments & FIDs');
});

test('commercial signals raise the relevance score', () => {
  const weak = S.prepare(item('Hydrogen production capacity update with investment'));
  const strong = S.prepare(item('Hydrogen final investment decision for 500 MW plant, €1 billion offtake'));
  assert.ok(strong.score > weak.score);
});

test('deduplicates by canonical URL and by normalised headline, keeping the newest', () => {
  const a = S.prepare(item('Hydrogen offtake agreement 100 MW', { link: 'https://www.example.com/a/?utm_source=x', date: '2026-10-20T10:00:00Z' }));
  const sameUrl = S.prepare(item('Hydrogen offtake agreement signed 100 MW', { link: 'https://example.com/a', date: '2026-10-19T10:00:00Z' }));
  const sameTitle = S.prepare(item('HYDROGEN: offtake agreement, 100 MW!', { link: 'https://other.com/b', date: '2026-10-18T10:00:00Z' }));
  const other = S.prepare(item('Hydrogen electrolyser contract 50 MW'));
  assert.deepEqual(S.dedupe([sameTitle, sameUrl, a, other]).map(x => x.link), [a.link, other.link]);
});

test('date windows include today and the preceding N-1 calendar days', () => {
  const now = new Date(2026, 9, 21, 14);
  for (const days of [2, 4, 7, 14, 30]) {
    assert.equal(S.windowStart(days, now).getTime(), new Date(2026, 9, 21 - (days - 1)).getTime());
  }
});

test('the page has the required date-range options with four days selected', () => {
  const html = fs.readFileSync(new URL('../src/template.html', import.meta.url), 'utf8');
  const select = html.match(/<select id="age"[\s\S]*?<\/select>/)[0];
  assert.deepEqual([...select.matchAll(/value="(\d+)"/g)].map(m => +m[1]), [2, 4, 7, 14, 30]);
  assert.match(select, /value="4" selected/);
  assert.equal(Object.keys(S.TOPICS).length, 8);
});

test('every configured source has a name and public HTTPS feed URLs', () => {
  const { sources } = JSON.parse(fs.readFileSync(new URL('../config/sources.json', import.meta.url), 'utf8'));
  assert.ok(sources.length > 50);
  for (const s of sources) {
    assert.ok(s.name && s.urls.length);
    for (const u of s.urls) assert.equal(new URL(u).protocol, 'https:');
  }
});
