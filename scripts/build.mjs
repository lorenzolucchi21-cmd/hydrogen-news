import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { XMLParser } from 'fast-xml-parser';
import * as heModule from 'he';
import { translateHeadlines } from './translate.mjs';

const he = heModule.default ?? heModule;
const shared = fs.readFileSync('src/shared.js', 'utf8');
const S = new Function(`${shared}; return { prepare, dedupe, windowStart, detectLang };`)();
// Curated illustrative photos (files in public/img). Only entries whose image files exist are published.
const imageLibrary = JSON.parse(fs.readFileSync('config/images.json', 'utf8')).images
  .filter(i => fs.existsSync(`public/photos/${i.file}`) && fs.existsSync(`public/photos/${i.small}`));
if (!imageLibrary.length) console.warn('Warning: no illustrative photos found; stories without their own picture will show no image.');
const config = JSON.parse(fs.readFileSync('config/sources.json', 'utf8'));

// Source types in config/sources.json:
//  - "urls":   public RSS/Atom feeds, read directly.
//  - "google": a publisher with no usable public feed or that blocks automated access. Only headlines and links are
//              taken from Google News' public search feed, restricted to that site. Nothing is fetched from the publisher.
//  - "search": a broad Google News query across all publishers (each story keeps its real publisher name).
//  - "lang":   "en" (default), "de" or "nl": which Google News edition to ask, and the language assumed for the headlines.
const EDITIONS = { en: ['en-GB', 'GB', 'GB:en'], de: ['de', 'DE', 'DE:de'], nl: ['nl', 'NL', 'NL:nl'] };
const TERMS = {
  en: '(hydrogen OR Wasserstoff OR waterstof OR ammonia OR e-SAF OR eSAF OR "e-fuels" OR electrolyser)',
  de: '(Wasserstoff OR Elektrolyseur OR eFuels OR eSAF OR Brennstoffzelle OR Ammoniak OR hydrogen)',
  nl: '(waterstof OR elektrolyser OR hydrogen OR ammoniak OR eSAF)'
};
const googleFeed = (query, lang = 'en') => {
  const [hl, gl, ceid] = EDITIONS[lang] || EDITIONS.en;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:30d`)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
};
const sources = config.sources.map(s => ({
  pages: 1, ...s,
  urls: [...(s.urls || []), ...(s.google ? [googleFeed(`${TERMS[s.lang] || TERMS.en} site:${s.google}`, s.lang)] : []), ...(s.search ? [googleFeed(s.search, s.lang)] : [])]
}));
if (new Set(sources.map(s => s.name)).size !== sources.length) throw new Error('Duplicate source names in config/sources.json');
const byName = new Map(sources.map(s => [s.name, s]));
const optionsFor = s => ({ minScore: s.minScore, lang: s.lang });
// Stock-tip and similar aggregator sites that only repeat company news with share-price commentary.
const blocked = new Set((config.blockedPublishers || []).map(n => n.toLowerCase()));
const allowed = a => !blocked.has(String(a.source).toLowerCase());

const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false,
  trimValues: true, processEntities: false, maxNestedTags: 5000,
  stopNodes: ['*.summary', '*.content', '*.title', '*.description', '*.encoded']
});
const list = v => v == null ? [] : Array.isArray(v) ? v : [v];
const text = v => typeof v === 'string' ? v : v?.['#text'] || '';
function flat(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flat).join(' ');
  if (node && typeof node === 'object') return Object.entries(node).filter(([k]) => !k.startsWith('@_')).map(([, v]) => flat(v)).join(' ');
  return '';
}
const plain = v => he.decode(he.decode(flat(v).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
// An empty value must stay empty: resolving '' against the feed address would return the feed address itself.
const abs = (v, base) => { if (!v) return ''; try { const u = new URL(he.decode(v), base); return /^https?:$/.test(u.protocol) && !u.username ? u.href : ''; } catch { return ''; } };

function parseFeed(xml, base, sourceName, usePublisher = false) {
  const p = parser.parse(xml.replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/i, ''));
  const isAtom = Object.hasOwn(p, 'feed');
  if (!isAtom && !p.rss?.channel && !p.RDF) throw new Error('not an RSS/Atom feed');
  const items = list(isAtom ? p.feed.entry : p.rss?.channel ? p.rss.channel.item : p.RDF?.item);
  return items.map(it => {
    const alt = list(it.link).find(l => !l?.['@_rel'] || l['@_rel'] === 'alternate');
    const link = abs(isAtom ? alt?.['@_href'] : text(it.link) || (it.guid?.['@_isPermaLink'] !== 'false' ? text(it.guid) : ''), base);
    const media = list(it.thumbnail)[0] || list(it.group?.thumbnail)[0] || list(it.content).find(v => v?.['@_url']);
    const enc = list(it.enclosure).find(v => /^image\//.test(v?.['@_type'] || ''));
    const emb = he.decode(text(it.description || it.encoded)).match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    const google = base.startsWith('https://news.google.com/');
    const publisher = plain(it.source);
    let title = plain(it.title);
    // Google appends " - Publisher" to headlines; its description repeats the headline, so no summary is kept.
    if (google && publisher && title.endsWith(' - ' + publisher)) title = title.slice(0, -(publisher.length + 3));
    return {
      title, summary: google ? '' : plain(it.summary || it.description || it.encoded || it.content).slice(0, 320),
      link, date: text(it.pubDate || it.published || it.date || it.updated), source: usePublisher && publisher ? publisher : sourceName,
      image: abs(media?.['@_url'] || enc?.['@_url'] || emb, base)
    };
  });
}

async function get(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'HydrogenNewsCollector/1.0 (public RSS/Atom metadata)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.stop = r.status < 429 && r.status !== 408; throw e; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 4_000_000) { const e = new Error('feed too large'); e.stop = true; throw e; }
      return { body: buf.toString('utf8'), url: r.url || url };
    } catch (e) {
      if (e.stop || attempt >= 2) throw e;
      await sleep(800 * 2 ** attempt);
    }
  }
}

const now = new Date();
const from = S.windowStart(30, now);
const inWindow = a => new Date(a.date) >= from && new Date(a.date) <= now;
const results = new Array(sources.length);
let next = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < sources.length) {
    const i = next++, s = sources[i];
    const targets = s.urls.flatMap(u => Array.from({ length: s.pages }, (_, n) => n ? u + (u.includes('?') ? '&' : '?') + 'paged=' + (n + 1) : u));
    const articles = [];
    let reached = 0, error = '';
    // Pages beyond the first are optional; a failure there must not mark the source as unreachable.
    for (const url of targets) {
      try {
        const { body, url: finalUrl } = await get(url);
        reached++;
        for (const raw of parseFeed(body, finalUrl, s.name, !!s.search)) {
          const a = S.prepare(raw, optionsFor(s));
          if (a && inWindow(a) && allowed(a)) articles.push({ ...a, origin: s.name });
        }
      } catch (e) { error = (e.cause?.code || e.message).slice(0, 60); }
    }
    results[i] = { name: s.name, articles, reached, error };
  }
}));

let previous = { articles: [] };
try { previous = JSON.parse(fs.readFileSync('data/archive.json', 'utf8')); } catch { /* first run */ }
const reachedCount = results.filter(r => r.reached).length;
if (!reachedCount) { console.error('No source could be reached; keeping the previous archive and not publishing.'); process.exit(1); }

// Earlier archive entries are re-checked against the current filter, so rule changes also clean up old stories.
const earlier = (previous.articles || []).flatMap(a => {
  const s = byName.get(a.origin || a.source);
  const p = s && S.prepare(a, optionsFor(s));
  return p ? [{ ...p, origin: s.name, titleEn: a.titleEn }] : [];
});
const archived = S.dedupe([...results.flatMap(r => r.articles), ...earlier].filter(a => inWindow(a) && allowed(a)));
const knownTranslations = new Map(earlier.filter(a => a.titleEn).map(a => [a.link, a.titleEn]));
for (const a of archived) if (!a.titleEn && knownTranslations.has(a.link)) a.titleEn = knownTranslations.get(a.link);
const translation = await translateHeadlines(archived);
console.log(`Translations: ${translation.translated} new, ${translation.failed} failed, ${translation.remaining} still untranslated.`);

const counts = {};
for (const a of archived) counts[a.origin] = (counts[a.origin] || 0) + 1;
const data = {
  generatedAt: now.toISOString(),
  articles: archived.map(({ title, titleEn, lang, summary, link, date, source, origin, image, topic, region, market, score }) => ({ title, titleEn, lang, summary, link, date, source, origin, image, topic, region, market, score })),
  sources: results.map(r => ({ name: r.name, shown: counts[r.name] || 0, status: r.reached ? 'ok' : 'unreachable', error: r.reached ? '' : r.error }))
};

fs.mkdirSync('data', { recursive: true });
fs.mkdirSync('site', { recursive: true });
fs.writeFileSync('data/archive.json', JSON.stringify(data, null, 1) + '\n');
fs.writeFileSync('site/news.json', JSON.stringify(data));
// Icons and the web app manifest (home-screen shortcut on phones)
if (fs.existsSync('public')) fs.cpSync('public', 'site', { recursive: true });
else console.warn('Warning: the "public" folder is missing, so the phone home-screen icon will not be published.');
const html = fs.readFileSync('src/template.html', 'utf8')
  .replace('/*STYLE*/', () => fs.readFileSync('src/style.css', 'utf8'))
  .replace('/*SHARED*/', () => shared)
  .replace('/*DATA*/', () => JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, ' '))
  .replace('/*IMAGES*/', () => JSON.stringify(imageLibrary).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, ' '));
fs.writeFileSync('site/index.html', html);

console.log(`Reached ${reachedCount}/${sources.length} sources; ${archived.length} articles in the 30-day archive.`);
for (const r of results.filter(x => !x.reached)) console.log(`UNREACHABLE ${r.name}: ${r.error}`);
