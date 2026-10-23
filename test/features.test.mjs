import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const S = new Function(`${read('../src/shared.js')}; return { prepare, topicOf, regionOf, detectLang, groupSimilar, dealSignal, dealFlow, FLOW_MIN_STORIES, TOPICS };`)();
const story = (title, extra = {}) => ({ title, summary: '', link: 'https://example.com/' + encodeURIComponent(title), date: '2026-10-20T10:00:00Z', source: 'Example', ...extra });

// ---- Regions ------------------------------------------------------------------------------------------------
test('German and Dutch stories are filed under Germany and Benelux', () => {
  assert.equal(S.prepare(story('Wasserstoff: Investition in Elektrolyseur für Raffinerie in Spanien geplant', { summary: 'Neue Anlage in Spanien.' })).region, 'Germany');
  assert.equal(S.prepare(story('Waterstofproject in Spanje krijgt 120 miljoen euro subsidie')).region, 'Benelux');
  assert.equal(S.regionOf('anything at all', 'de'), 'Germany');
  assert.equal(S.regionOf('anything at all', 'nl'), 'Benelux');
});

test('short German headlines from a German source are recognised as German', () => {
  assert.equal(S.detectLang('Zwei Jahre Wasserstoff-Kernnetz: Erste Leitungen in Betrieb', 'de'), 'de');
  assert.equal(S.detectLang('Zwei Jahre Wasserstoff-Kernnetz: Erste Leitungen in Betrieb', 'en'), 'en');
  assert.equal(S.detectLang('H2Global Foundation and H2DER sign MoU in Türkiye'), 'en');
});

test('English stories get the region with the most keyword matches, or Global', () => {
  assert.equal(S.regionOf('Danish e-SAF plant gets Plug Power electrolysers'), 'Nordics');
  assert.equal(S.regionOf('Germany and Germany again, plus one mention of Spain'), 'Germany');
  assert.equal(S.regionOf('Chinese electrolyser maker wins order in Saudi Arabia, China expands'), 'Asia-Pacific');
  assert.equal(S.regionOf('Electrolyser maker raises capital'), 'Global');
});

test('place keywords do not fire inside other words', () => {
  assert.equal(S.regionOf('A woman leads an essential project in a romantic setting'), 'Global');
  assert.equal(S.regionOf('The queue for lieu of payment, plus indiana'), 'Global');
  assert.equal(S.regionOf('Oman signs a green hydrogen deal'), 'Middle East');
  assert.equal(S.regionOf('Essen utility plans hydrogen network'), 'Germany');
  assert.equal(S.regionOf('UK government backs hydrogen'), 'UK & Ireland');
});

// ---- Topics -------------------------------------------------------------------------------------------------
test('topics are scored, not first-match: a labelled set of real-style headlines', () => {
  const labelled = [
    ['Shell takes final investment decision on 1 GW green hydrogen plant', 'Investments & FIDs'],
    ['Sparc Hydrogen raises AUD 1.3 million to advance solar-to-hydrogen technology', 'Investments & FIDs'],
    ['Greenzo Energy raises Rs 1.3 billion to expand green hydrogen electrolyser manufacturing', 'Investments & FIDs'],
    ['Uniper agrees 40,000 t/yr e-SAF offtake with Arcadia', 'Offtake & Supply'],
    ['EWE to supply Tesa with green hydrogen under a long-term agreement', 'Offtake & Supply'],
    ['Germany to ring-fence €1.5bn for hydrogen in next year’s Carbon Contracts for Difference auction', 'Policy & Auctions'],
    ['Germany unveils new ten-point plan to scale up the hydrogen market', 'Policy & Auctions'],
    ['France plans e-SAF double-sided auction in 2027 budget', 'Policy & Auctions'],
    ['Core network of hydrogen pipelines in operation for two years', 'Infrastructure & Storage'],
    ['Hydrogen cavern storage project gets permit', 'Infrastructure & Storage'],
    ['Q8Aviation selects ETFuels for proposed UK e-SAF supply deal', 'Aviation & e-SAF'],
    ['Hydrogen for Hamburg’s Holborn refinery', 'Steel & Industry'],
    ['Thyssenkrupp steel plans hydrogen-based direct reduction plant', 'Steel & Industry'],
    ['Maersk Tankers’ ammonia retrofit project selected for EU Innovation Fund support', 'Ammonia & e-Fuels'],
    ['OMV begins electrolyser installation at 140MW Austrian hydrogen project', 'Production & Technology'],
    ['Nel launches new electrolyser stack production line', 'Production & Technology'],
    ['Kawasaki launches construction of hydrogen liquefaction plant', 'Production & Technology'],
    ['Wasserstoff-Kernnetz: Erste Leitungen in Betrieb', 'Infrastructure & Storage'],
    ['Ministerium plant Förderprogramm für Wasserstoff', 'Policy & Auctions']
  ];
  const wrong = labelled.filter(([title, topic]) => S.topicOf(title) !== topic).map(([title, topic]) => `${title} -> ${S.topicOf(title)} (expected ${topic})`);
  assert.deepEqual(wrong, []);
});

test('weak or unrelated wording ends up in "Other Hydrogen News"; one generic word does not decide the topic', () => {
  assert.equal(S.topicOf('Dutch hydrogen company files for bankruptcy'), 'Other Hydrogen News');
  assert.equal(S.topicOf('Hydrogen firm names new chief executive'), 'Other Hydrogen News');
  assert.notEqual(S.topicOf('Ten million visitors expected at hydrogen refuelling station opening'), 'Investments & FIDs');
});

test('"refuelling" is not an e-fuel, and "industrialization" is not industry', () => {
  assert.notEqual(S.topicOf('Refuelling firm files for bankruptcy'), 'Ammonia & e-Fuels');
  assert.equal(S.topicOf('Plug Power names PEM industrialization lead'), 'Other Hydrogen News');
});

// ---- Stories reported by several publishers -------------------------------------------------------------------
test('reports of the same story are grouped; different stories and distant dates are not', () => {
  const a = story('EWE and Verbund establish joint venture for 500 MW electrolyser in Nordenham', { source: 'H2 International' });
  const b = story('Ewe and Verbund jointly build 500 MW electrolyser', { source: 'energate', date: '2026-10-21T08:00:00Z' });
  const c = story('Hydrogen hub: ewe and Verbund plan 500 MW', { source: 'ZfK', date: '2026-10-19T08:00:00Z' });
  const other = story('Plug Power signs 280 MW electrolyser supply agreement with Arcadia eFuels', { source: 'Hydrogen Insight' });
  const old = story('EWE and Verbund establish joint venture for 500 MW electrolyser again', { source: 'Old', date: '2026-09-01T08:00:00Z' });
  const groups = S.groupSimilar([a, b, c, other, old]);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups[0].also.map(x => x.source), ['energate', 'ZfK']);
  assert.equal(groups[0].source, 'H2 International');
  assert.deepEqual(groups[1].also, []);
  assert.equal(groups[2].source, 'Old');
});

test('grouping does not merge unrelated headlines that share generic words', () => {
  const groups = S.groupSimilar([
    story('Hydrogen project in Germany receives funding'),
    story('Hydrogen project in Spain receives funding from the EU'),
    story('Green hydrogen plant in Chile reaches final investment decision')
  ]);
  assert.equal(groups.length, 3);
});

// ---- Deal-flow balance ---------------------------------------------------------------------------------------
test('headlines are classified as positive deal news, setbacks, or neither', () => {
  assert.equal(S.dealSignal(story('RWE takes final investment decision on electrolyser')), 'positive');
  assert.equal(S.dealSignal(story('Uniper signs offtake deal with Arcadia')), 'positive');
  assert.equal(S.dealSignal(story('OMV begins electrolyser installation at Austrian project')), 'positive');
  assert.equal(S.dealSignal(story('Hydrogen firm secures €20 million Series B funding')), 'positive');
  assert.equal(S.dealSignal(story('Developer cancels green hydrogen project')), 'negative');
  assert.equal(S.dealSignal(story('Dutch hydrogen company files for bankruptcy')), 'negative');
  assert.equal(S.dealSignal(story('Wasserstoffprojekt wegen Insolvenz gestoppt')), 'negative');
  assert.equal(S.dealSignal(story('Hydrogen conference explores future of the sector')), null);
  assert.equal(S.dealSignal(story('Firm signs deal but cancels second project')), null);
});

test('the summary is used only when the headline has no signal', () => {
  assert.equal(S.dealSignal(story('Hydrogen update', { summary: 'The developer cancelled the plan.' })), 'negative');
  assert.equal(S.dealSignal(story('Developer signs supply agreement', { summary: 'It also cancelled an older plan.' })), 'positive');
});

test('deal-flow balance compares the last 7 days with the 7 days before and needs enough stories', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const day = 864e5;
  const make = (title, daysAgo) => story(title + daysAgo, { date: new Date(now - daysAgo * day).toISOString() });
  const stories = [];
  for (let i = 0; i < 9; i++) stories.push(make('Company signs offtake agreement ', 0.5 + i * 0.5));
  for (let i = 0; i < 3; i++) stories.push(make('Project cancelled ', 1 + i));
  for (let i = 0; i < 6; i++) stories.push(make('Company signs supply agreement ', 8 + i * 0.5));
  for (let i = 0; i < 6; i++) stories.push(make('Project delayed ', 8.2 + i * 0.5));
  stories.push(make('Hydrogen conference news ', 2), make('Company signs offtake agreement ', 20));
  const f = S.dealFlow(stories, now);
  assert.deepEqual([f.current.pos, f.current.neg, f.current.n, f.current.balance], [9, 3, 12, 50]);
  assert.deepEqual([f.previous.pos, f.previous.neg, f.previous.balance], [6, 6, 0]);
  assert.equal(f.reliable, true);
  assert.equal(f.delta, 50);
  const thin = S.dealFlow(stories.slice(0, 5), now);
  assert.equal(thin.reliable, false);
  assert.equal(thin.delta, null);
  assert.equal(S.FLOW_MIN_STORIES, 8);
  assert.equal(S.dealFlow([], now).current.balance, null);
});

// ---- Page and icons ------------------------------------------------------------------------------------------
test('only the lead story can show a picture, and no placeholder text or relative dates are shown', () => {
  const html = read('../src/template.html');
  const card = html.match(/function card\(a\) \{[\s\S]*?\n\}/)[0];
  assert.doesNotMatch(card, /<img/);
  assert.doesNotMatch(html, /No summary supplied/);
  assert.doesNotMatch(html, /\bago\b/);
  const lead = html.match(/\$\('lead'\)\.innerHTML = [\s\S]*?<div class="side">/)[0];
  assert.match(lead, /<img src=/);
  assert.match(html, /find\(x => safe\(x\.image\)\)/);
});

test('page has the accessibility and layout refinements', () => {
  const html = read('../src/template.html');
  const css = read('../src/style.css');
  assert.match(html, /class="skip"/);
  assert.match(html, /class="stickybar"/);
  assert.match(html, /aria-live|role="status"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.story h3\{[^}]*-webkit-line-clamp/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media\(max-width:760px\)\{\.stickybar\{position:static\}\}/);
});

test('the deal-flow panel is on the page with an explanation', () => {
  const html = read('../src/template.html');
  assert.match(html, /id="flow"/);
  assert.match(html, /How is this calculated\?/);
  assert.match(html, /dealFlow\(stories\)/);
});

function pngSize(path) {
  const b = fs.readFileSync(new URL(path, import.meta.url));
  assert.equal(b.subarray(1, 4).toString(), 'PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('home-screen icons and the web app manifest exist and are linked', () => {
  assert.deepEqual(pngSize('../public/apple-touch-icon.png'), [180, 180]);
  assert.deepEqual(pngSize('../public/icon-192.png'), [192, 192]);
  assert.deepEqual(pngSize('../public/icon-512.png'), [512, 512]);
  const manifest = JSON.parse(read('../public/manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.short_name.length <= 12);
  assert.ok(manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable'));
  for (const icon of manifest.icons) assert.ok(fs.existsSync(new URL('../public/' + icon.src, import.meta.url)), icon.src);
  const html = read('../src/template.html');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="apple-touch-icon\.png">/);
  assert.match(html, /name="apple-mobile-web-app-title" content="H2 News"/);
  assert.match(html, /name="theme-color"/);
});

test('the build copies the public assets into the published site', () => {
  assert.match(read('../scripts/build.mjs'), /fs\.cpSync\('public', 'site', \{ recursive: true \}\)/);
});
