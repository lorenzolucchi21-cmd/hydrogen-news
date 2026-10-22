import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const S = new Function(`${fs.readFileSync(new URL('../src/shared.js', import.meta.url), 'utf8')}; return { prepare, dedupe, windowStart, canonicalUrl, detectLang, TOPICS };`)();
const item = (title, extra = {}) => ({ title, summary: '', link: 'https://example.com/' + encodeURIComponent(title), date: '2026-10-20T10:00:00Z', source: 'Example', ...extra });

test('keeps commercially relevant hydrogen news and drops weak, off-topic or event items', () => {
  assert.ok(S.prepare(item('RWE takes final investment decision on 300 MW electrolyser')));
  assert.equal(S.prepare(item('Solar farm signs contract for 300 MW')), null);
  assert.equal(S.prepare(item('Hydrogen science discovery')), null);
  assert.equal(S.prepare(item('Hydrogen conference announces investment webinar')), null);
  assert.equal(S.prepare(item('Hydrogen project link', { link: 'javascript:alert(1)' })), null);
  assert.equal(S.prepare(item('Hydrogen contract', { date: 'not a date' })), null);
});

test('headline-only items (no summary) use a lower relevance bar', () => {
  assert.ok(S.prepare(item("India's NTPC seeks overseas buyers for green ammonia, eSAF project")));
  assert.equal(S.prepare(item('Hydrogen project update', { summary: 'A short note.' })), null);
  assert.equal(S.prepare(item('Hydrogen update')), null);
});

test('the news the manager flagged as important is kept', () => {
  const kept = [
    ['Uniper and Arcadia eFuels sign long-term agreement to accelerate aviation decarbonization', ''],
    ['Uniper signs 40,000-t/y eSAF off-take deal with Arcadia', ''],
    ["Germany's Uniper signs offtake deal for synthetic green jet fuels", ''],
    ['Gegen den Trend – EWE und Verbund planen Wasserstoff-Elektrolyseur', 'Neue Hoffnung für den Wasserstoffmarkt: Das Energieunternehmen und der Stromerzeuger treiben ein Elektrolyseur-Projekt in industrieller Dimension voran – unter einer Bedingung.'],
    ['Job-Motor aus Bayern: Reverion raist 154 Millionen und will 800 Leute in einer neuen Fabrik einstellen', 'Reverion baut Gas-Kraftwerke mit hoher Effizienz.'],
    ['Spain vying to become European leader in green hydrogen with €1 billion project led by Moeve', '']
  ];
  for (const [title, summary] of kept) assert.ok(S.prepare(item(title, { summary })), title);
});

test('battery chemistry is not hydrogen news, and research or market-report items are dropped', () => {
  assert.equal(S.prepare(item('US team maps electrolyte chemistry to guide next-generation battery designs', { summary: 'Lithium clusters in battery electrolytes, a study by Columbia University.' })), null);
  assert.equal(S.prepare(item('Researchers develop novel catalyst for hydrogen production', { summary: 'University study.' })), null);
  assert.equal(S.prepare(item('Hydrogen Market to reach $50 billion by 2032, CAGR 8%')), null);
  assert.ok(S.prepare(item('Hydrogen electrolyser maker wins contract', { summary: 'Order for electrolysers.' })));
});

test('large deals score above small ones', () => {
  const big = S.prepare(item('Shell takes final investment decision on 1 GW green hydrogen plant'));
  const small = S.prepare(item('Startup signs deal for 2 MW electrolyser project'));
  assert.ok(big.score > small.score);
});

test('stock-tip headlines, job postings and nickel-hydrogen batteries are dropped', () => {
  for (const title of ['Plug Power Aktie: Arcadia eFuels bestellt 280-MW-Elektrolyseure', 'Bid Project Manager Hydrogen Systems - Spanien - 305512',
    'EnerVenue secures order for nickel-hydrogen batteries', 'A Molecular Pendulum for Efficient Hydrogen Production']) {
    assert.equal(S.prepare(item(title, { summary: 'Hydrogen production project order for electrolysers.' })), null, title);
  }
});

test('project milestones for big hydrogen projects are kept', () => {
  assert.ok(S.prepare(item('Moeve launches construction of Europe’s largest green hydrogen project')));
  assert.ok(S.prepare(item('Stadtwerke planen 3.200 MW Elektrolyseleistung für Wasserstoff')));
});

test('Dutch headlines are recognised and classified', () => {
  const a = S.prepare(item('Waterstofproject Rotterdam krijgt 120 miljoen euro subsidie'));
  assert.equal(a.lang, 'nl');
  assert.equal(a.region, 'Benelux');
});

test('language detection distinguishes English, German and Dutch', () => {
  assert.equal(S.detectLang('Uniper signs offtake deal with Arcadia'), 'en');
  assert.equal(S.detectLang('EWE und Verbund planen Wasserstoff-Elektrolyseur'), 'de');
  assert.equal(S.detectLang('Waterstofproject krijgt subsidie van het Rijk'), 'nl');
  assert.equal(S.detectLang('Plug Power Nel ITM'), 'en');
  assert.equal(S.detectLang('Plug Power Nel ITM', 'de'), 'de');
  assert.equal(S.prepare(item('Gegen den Trend – EWE und Verbund planen Wasserstoff-Elektrolyseur', { summary: 'Ein Elektrolyseur-Projekt der EWE.' })).lang, 'de');
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
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,/);
});

test('every configured source is a public feed, a Google News site or a Google News search', () => {
  const { sources } = JSON.parse(fs.readFileSync(new URL('../config/sources.json', import.meta.url), 'utf8'));
  assert.ok(sources.length > 150);
  assert.equal(new Set(sources.map(s => s.name)).size, sources.length);
  for (const s of sources) {
    assert.ok(s.name);
    assert.ok(s.urls?.length || s.google || s.search, s.name);
    if (s.google) assert.match(s.google, /^[a-z0-9.-]+\.[a-z]{2,}$/);
    if (s.search) assert.ok(Number.isFinite(s.minScore), s.name);
    if (s.lang) assert.ok(['en', 'de', 'nl'].includes(s.lang), s.name);
    for (const u of s.urls || []) assert.equal(new URL(u).protocol, 'https:');
  }
  const names = new Set(sources.map(s => s.name));
  for (const n of ['Hydrogen Insight', 'Reuters', 'Uniper', 'Business Insider Deutschland', 'Handelsblatt']) assert.ok(names.has(n), n);
  assert.ok(sources.filter(s => s.lang === 'de').length >= 20);
  assert.ok(sources.filter(s => s.lang === 'nl').length >= 5);
  assert.ok(sources.filter(s => s.search).length >= 8);
});

test('the page shows English headlines with the original beneath and keeps the language tag', () => {
  const html = fs.readFileSync(new URL('../src/template.html', import.meta.url), 'utf8');
  assert.match(html, /a\.titleEn \|\| a\.title/);
  assert.match(html, /class="orig"/);
});
