import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { XMLParser } from 'fast-xml-parser';
import * as heModule from 'he';

const he = heModule.default ?? heModule;
const shared = fs.readFileSync('src/shared.js', 'utf8');
const S = new Function(`${shared}; return { prepare, dedupe, windowStart };`)();
const config = JSON.parse(fs.readFileSync('config/sources.json', 'utf8'));
const sources = config.sources.map(s => ({ pages: 1, ...s }));
if (new Set(sources.map(s => s.name)).size !== sources.length) throw new Error('Duplicate source names in config/sources.json');

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
const abs = (v, base) => { try { const u = new URL(he.decode(v || ''), base); return /^https?:$/.test(u.protocol) && !u.username ? u.href : ''; } catch { return ''; } };

function parseFeed(xml, base, sourceName) {
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
    return {
      title: plain(it.title).replace(/\s+-\s+[^-]{2,40}$/, ''), summary: plain(it.summary || it.description || it.encoded || it.content).slice(0, 320),
      link, date: text(it.pubDate || it.published || it.date || it.updated), source: sourceName,
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
        for (const raw of parseFeed(body, finalUrl, s.name)) { const a = S.prepare(raw); if (a && inWindow(a)) articles.push(a); }
      } catch (e) { error = (e.cause?.code || e.message).slice(0, 60); }
    }
    results[i] = { name: s.name, articles, reached, error };
  }
}));

let previous = { articles: [] };
try { previous = JSON.parse(fs.readFileSync('data/archive.json', 'utf8')); } catch { /* first run */ }
const known = new Set(sources.map(s => s.name));
const reachedCount = results.filter(r => r.reached).length;
if (!reachedCount) { console.error('No source could be reached; keeping the previous archive and not publishing.'); process.exit(1); }

const archived = S.dedupe([...results.flatMap(r => r.articles), ...(previous.articles || [])]
  .filter(a => known.has(a.source) && inWindow(a)));
const counts = {};
for (const a of archived) counts[a.source] = (counts[a.source] || 0) + 1;
const data = {
  generatedAt: now.toISOString(),
  articles: archived.map(({ title, summary, link, date, source, image, topic, region, score }) => ({ title, summary, link, date, source, image, topic, region, score })),
  sources: results.map(r => ({ name: r.name, shown: counts[r.name] || 0, status: r.reached ? 'ok' : 'unreachable', error: r.reached ? '' : r.error }))
};

fs.mkdirSync('data', { recursive: true });
fs.mkdirSync('site', { recursive: true });
fs.writeFileSync('data/archive.json', JSON.stringify(data, null, 1) + '\n');
fs.writeFileSync('site/news.json', JSON.stringify(data));
const html = fs.readFileSync('src/template.html', 'utf8')
  .replace('/*STYLE*/', () => fs.readFileSync('src/style.css', 'utf8'))
  .replace('/*SHARED*/', () => shared)
  .replace('/*DATA*/', () => JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, ' '));
fs.writeFileSync('site/index.html', html);

console.log(`Reached ${reachedCount}/${sources.length} sources; ${archived.length} articles in the 30-day archive.`);
for (const r of results.filter(x => !x.reached)) console.log(`UNREACHABLE ${r.name}: ${r.error}`);
