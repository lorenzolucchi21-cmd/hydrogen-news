import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const S = new Function(`${read('../src/shared.js')}; return { prepare, topicOf, regionOf, marketOf, rankScore, imageCategory, pickImage, hashString, detectLang, groupSimilar, dealSignal, dealFlow, FLOW_MIN_STORIES, TOPICS, IMAGE_RULES };`)();
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

// ---- Market priority -------------------------------------------------------------------------------------------
test('stories are tagged core (Germany, Netherlands, UK, Denmark), EU or other', () => {
  assert.equal(S.marketOf('Germany launches hydrogen auction', 'en'), 'core');
  assert.equal(S.marketOf('Rotterdam port plans ammonia terminal', 'en'), 'core');
  assert.equal(S.marketOf('UK backs hydrogen with new funding', 'en'), 'core');
  assert.equal(S.marketOf('Danish e-SAF plant gets electrolysers', 'en'), 'core');
  assert.equal(S.marketOf('Spain launches hydrogen valley', 'en'), 'eu');
  assert.equal(S.marketOf('Norwegian firm wins electrolyser order', 'en'), 'eu');
  assert.equal(S.marketOf('EU agrees hydrogen target', 'en'), 'eu');
  assert.equal(S.marketOf('Indian developer starts hydrogen production', 'en'), 'other');
  assert.equal(S.marketOf('Brazil e-fuels project reaches FID', 'en'), 'other');
  assert.equal(S.marketOf('Chinese electrolyser maker expands', 'en'), 'other');
});

test('a story that names a core market counts as core, even when the project is elsewhere', () => {
  assert.equal(S.marketOf('NTPC seeks overseas buyers in Japan, South Korea and Germany', 'en'), 'core');
  assert.equal(S.marketOf('AM Green wins H2Global auction for green ammonia deal with Germany', 'en'), 'core');
});

test('German and Dutch stories are core unless they are clearly about a region outside Europe', () => {
  assert.equal(S.marketOf('Elektrolyseur-Projekt der EWE geplant', 'de'), 'core');
  assert.equal(S.marketOf('Waterstofproject krijgt subsidie', 'nl'), 'core');
  assert.equal(S.marketOf('Wasserstoffprojekt in China geht in Betrieb', 'de'), 'other');
  assert.equal(S.prepare(story('Stadtwerke planen Elektrolyseur für Wasserstoff mit 20 MW', { summary: 'Ein Projekt für Industrie und Mobilität in Niedersachsen.' })).market, 'core');
});

test('every prepared story carries its market', () => {
  assert.equal(S.prepare(story('Shell takes final investment decision on 1 GW green hydrogen plant in Rotterdam')).market, 'core');
  assert.equal(S.prepare(story('Indian developer signs offtake agreement for 100 MW electrolyser')).market, 'other');
});

test('core-market stories rank above comparable stories from outside Europe', () => {
  const de = S.prepare(story('German utility signs hydrogen supply agreement for 100 MW electrolyser'));
  const eu = S.prepare(story('Spanish utility signs hydrogen supply agreement for 100 MW electrolyser'));
  const cn = S.prepare(story('Chinese utility signs hydrogen supply agreement for 100 MW electrolyser'));
  const t = Date.parse('2026-10-21T10:00:00Z');
  assert.ok(S.rankScore(de, t) > S.rankScore(eu, t));
  assert.ok(S.rankScore(eu, t) > S.rankScore(cn, t));
});

test('a modest core-market story outranks a routine production story from outside Europe', () => {
  const t = Date.parse('2026-10-21T10:00:00Z');
  const dutch = S.prepare(story('Dutch refinery signs hydrogen supply contract for electrolyser project'));
  const indian = S.prepare(story('Indian developer starts green hydrogen production at 150 MW plant, €200 million investment'));
  assert.equal(dutch.market, 'core');
  assert.equal(indian.market, 'other');
  assert.ok(S.rankScore(dutch, t) > S.rankScore(indian, t), `${S.rankScore(dutch, t)} vs ${S.rankScore(indian, t)}`);
});

test('outside Europe, e-SAF and e-fuel stories are not penalised but other topics are', () => {
  const t = Date.parse('2026-10-21T10:00:00Z');
  const base = { score: 10, date: '2026-10-21T10:00:00Z', market: 'other' };
  const plain = S.rankScore({ ...base, topic: 'Aviation & e-SAF' }, t);
  assert.equal(plain, 10 + 3);
  assert.equal(S.rankScore({ ...base, topic: 'Ammonia & e-Fuels' }, t), plain);
  assert.equal(S.rankScore({ ...base, topic: 'Production & Technology' }, t), plain - 3);
  assert.equal(S.rankScore({ ...base, topic: 'Investments & FIDs' }, t), plain - 3);
  assert.equal(S.rankScore({ ...base, market: 'core', topic: 'Production & Technology' }, t), plain + 8);
  assert.equal(S.rankScore({ ...base, market: 'eu', topic: 'Production & Technology' }, t), plain + 5);
});

test('newer stories rank above older ones with the same score and market', () => {
  const t = Date.parse('2026-10-21T10:00:00Z');
  const a = { score: 8, market: 'core', topic: 'Offtake & Supply', date: '2026-10-21T08:00:00Z' };
  const b = { ...a, date: '2026-10-17T08:00:00Z' };
  assert.ok(S.rankScore(a, t) > S.rankScore(b, t));
});

// ---- Pictures ---------------------------------------------------------------------------------------------------
test('story pictures are matched to the subject of the headline', () => {
  const cat = (title, topic = 'Other Hydrogen News', extra = {}) => S.imageCategory({ title, topic, summary: '', ...extra });
  assert.equal(cat('Ammonia tanker delivered to shipping company', 'Ammonia & e-Fuels'), 'ship');
  assert.equal(cat('Uniper signs e-SAF deal with Arcadia', 'Offtake & Supply'), 'aviation');
  assert.equal(cat('Germany sets hydrogen auction rules', 'Policy & Auctions'), 'policy');
  assert.equal(cat('Core network pipeline section opens', 'Infrastructure & Storage'), 'pipeline');
  assert.equal(cat('New hydrogen filling station opens', 'Infrastructure & Storage'), 'mobility');
  assert.equal(cat('Hydrogen supply for steel plant', 'Steel & Industry'), 'industry');
  assert.equal(cat('Offshore wind to hydrogen project', 'Production & Technology'), 'renewables');
  assert.equal(cat('Developer commissions 20 MW electrolyser', 'Production & Technology'), 'electrolyser');
  assert.equal(cat('Hydrogen company names new CEO'), 'hydrogen-general');
  assert.equal(cat('Wasserstoff-Kernnetz: Erste Leitungen in Betrieb', 'Infrastructure & Storage', { titleEn: 'Hydrogen core network: first pipelines in operation' }), 'pipeline');
  assert.equal(cat('Supply deal signed', 'Investments & FIDs', { summary: 'The new refinery will use green hydrogen.' }), 'industry');
});

const library = [
  { id: 'ship-a', cats: ['ship'] }, { id: 'ship-b', cats: ['ship'] },
  { id: 'pol-de', cats: ['policy'], regions: ['Germany'] }, { id: 'pol-uk', cats: ['policy'], regions: ['UK & Ireland'] }, { id: 'pol-eu', cats: ['policy'] },
  { id: 'general', cats: ['hydrogen-general'] }
];
const ship = (n, extra = {}) => ({ title: `Ammonia ship ${n}`, topic: 'Ammonia & e-Fuels', region: 'Global', link: `https://example.com/ship/${n}`, ...extra });

test('the same story always gets the same picture, and neighbouring stories avoid repeats', () => {
  assert.equal(S.pickImage(ship(1), library).id, S.pickImage(ship(1), library).id);
  const used = new Set();
  const first = S.pickImage(ship(1), library, used), second = S.pickImage(ship(2), library, used);
  assert.notEqual(first.id, second.id);
  const third = S.pickImage(ship(3), library, used);
  assert.ok(third && ['ship-a', 'ship-b'].includes(third.id), 'repeats only once every picture in the category is used');
});

test('a category that runs out of photos borrows from a related category before repeating', () => {
  const lib = [{ id: 'e1', cats: ['electrolyser'] }, { id: 'g1', cats: ['hydrogen-general'] }, { id: 'g2', cats: ['hydrogen-general'] }];
  const story = n => ({ title: `Developer commissions electrolyser ${n}`, topic: 'Production & Technology', region: 'Global', link: `https://example.com/e/${n}` });
  const used = new Set();
  const ids = [1, 2, 3].map(n => S.pickImage(story(n), lib, used).id);
  assert.equal(new Set(ids).size, 3, ids.join(','));
  assert.equal(ids.filter(id => id === 'e1').length, 1);
  const fourth = S.pickImage(story(4), lib, used);
  assert.ok(fourth, 'repeats once nothing else is left');
  const policyLib = [{ id: 'p1', cats: ['policy'] }, { id: 'x', cats: ['hydrogen-general'] }];
  const p = n => ({ title: 'New policy', topic: 'Policy & Auctions', region: 'Global', link: 'p' + n });
  const u2 = new Set();
  assert.equal(S.pickImage(p(1), policyLib, u2).id, 'p1');
  assert.equal(S.pickImage(p(2), policyLib, u2).id, 'p1', 'policy never borrows an off-topic photo');
});

test('policy pictures follow the story region, with a European fallback', () => {
  const policy = region => ({ title: 'New hydrogen policy', topic: 'Policy & Auctions', region, link: 'https://example.com/p/' + region });
  assert.equal(S.pickImage(policy('Germany'), library).id, 'pol-de');
  assert.equal(S.pickImage(policy('UK & Ireland'), library).id, 'pol-uk');
  assert.equal(S.pickImage(policy('Asia-Pacific'), library).id, 'pol-eu');
  assert.equal(S.pickImage(policy('Global'), library).id, 'pol-eu');
});

test('a category without pictures falls back to the general hydrogen picture; an empty library gives none', () => {
  assert.equal(S.pickImage({ title: 'Jet fuel news', topic: 'Aviation & e-SAF', region: 'Global', link: 'x' }, library).id, 'general');
  assert.equal(S.pickImage(ship(1), []), null);
});

function jpegSize(buf) {
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xd8);
  for (let i = 2; i < buf.length;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no JPEG size found');
}

test('the photo library: files exist, are 16:9 and light, and every credit is complete and openly licensed', () => {
  const { images } = JSON.parse(read('../config/images.json'));
  assert.ok(images.length >= 60, `${images.length} photos`);
  assert.equal(new Set(images.map(i => i.id)).size, images.length);
  let bytes = 0;
  for (const i of images) {
    assert.match(i.id, /^[a-z0-9-]+$/);
    assert.ok(i.cats.length && i.cats.every(c => typeof c === 'string'), i.id);
    const buf = fs.readFileSync(new URL(`../public/img/${i.id}.jpg`, import.meta.url));
    bytes += buf.length;
    assert.ok(buf.length < 160000, `${i.id} is ${buf.length} bytes`);
    const [w, h] = jpegSize(buf);
    assert.ok(w >= 600 && w <= 720, `${i.id} width ${w}`);
    assert.ok(Math.abs(w / h - 16 / 9) < 0.03, `${i.id} ratio ${w}x${h}`);
    assert.ok(i.credit.title && i.credit.author && i.credit.license && /^https:\/\/commons\.wikimedia\.org\//.test(i.credit.url), i.id);
    assert.match(i.credit.license, /^(CC0|Public domain|CC BY(-SA)? \d\.\d( [a-z]{2})?)$/i, `${i.id}: ${i.credit.license}`);
    assert.doesNotMatch(i.credit.author, /<|>/, i.id);
  }
  assert.ok(bytes < 6e6, `library is ${bytes} bytes`);
});

test('every picture category used by the rules has several photos, and policy has regional photos', () => {
  const { images } = JSON.parse(read('../config/images.json'));
  const count = c => images.filter(i => i.cats.includes(c)).length;
  for (const c of [...S.IMAGE_RULES.map(r => r[0]), 'hydrogen-general', 'policy']) assert.ok(count(c) >= 5, `${c}: ${count(c)}`);
  const policy = images.filter(i => i.cats.includes('policy'));
  for (const region of ['Germany', 'UK & Ireland', 'Benelux', 'Nordics']) assert.ok(policy.some(i => i.regions?.includes(region)), region);
  assert.ok(policy.filter(i => !i.regions).length >= 3);
});

test('a feed address is never kept as a story picture', () => {
  const withImage = image => S.prepare(story('Shell takes final investment decision on 1 GW green hydrogen plant', { image }));
  assert.equal(withImage('https://news.google.com/rss/search?q=hydrogen&hl=en-GB').image, '');
  assert.equal(withImage('https://example.com/feed/').image, '');
  assert.equal(withImage('https://example.com/news.xml').image, '');
  assert.equal(withImage('').image, '');
  assert.equal(withImage('javascript:alert(1)').image, '');
  assert.equal(withImage('https://example.com/photos/a.jpg').image, 'https://example.com/photos/a.jpg');
  assert.match(read('../scripts/build.mjs'), /const abs = \(v, base\) => \{ if \(!v\) return '';/);
});

test('the build publishes the photos and embeds the library and their credits', () => {
  const build = read('../scripts/build.mjs');
  assert.match(build, /config\/images\.json/);
  assert.match(build, /replace\('\/\*IMAGES\*\/'/);
  assert.match(build, /market, score \}\) => \(\{[^}]*market/);
});

// ---- Page and icons ------------------------------------------------------------------------------------------
test('every story card and the lead story show a picture, with a credit for illustrative photos', () => {
  const html = read('../src/template.html');
  const card = html.match(/function card\(a\) \{[\s\S]*?\n\}/)[0];
  assert.match(card, /\$\{photo\(a\)\}/);
  assert.match(html, /<div class="hero">\$\{photo\(lead\)\}/);
  assert.doesNotMatch(html, /find\(x => safe\(x\.image\)\)/);
  assert.match(html, /Illustrative photo:/);
  assert.match(html, /id="credits"/);
  assert.match(html, /Photo credits/);
  assert.doesNotMatch(html, /No summary supplied/);
  assert.doesNotMatch(html, /\bago\b/);
});

test('a publisher picture that fails to load is replaced by the illustrative photo, or removed', () => {
  const html = read('../src/template.html');
  assert.match(html, /document\.addEventListener\('error'[\s\S]*?\}, true\);/);
  assert.match(html, /img\.dataset\.fb/);
  assert.doesNotMatch(html, /onerror=/);
});

test('the page ranks stories with the shared market-aware rank and says so', () => {
  const html = read('../src/template.html');
  assert.match(html, /rankScore\(b, t\) - rankScore\(a, t\)/);
  assert.match(html, /core markets \(Germany, the Netherlands, the UK and Denmark\)/);
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
