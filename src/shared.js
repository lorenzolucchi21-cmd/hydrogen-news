const TOPICS = {
  'Investments & FIDs': /final investment decision|\bfid\b|invest|financ|funding|grant|stake|acquisition|million|billion/i,
  'Offtake & Supply': /offtake|supply agreement|purchase agreement|contract|procure|buyer|sales agreement/i,
  'Policy & Auctions': /policy|regulation|auction|subsid|mandate|quota|state aid|rfnbo|cbam|government/i,
  'Infrastructure & Storage': /pipeline|network|terminal|storage|cavern|corridor|infrastructure/i,
  'Aviation & e-SAF': /e-saf|sustainable aviation fuel|aviation|airline|aircraft/i,
  'Steel & Industry': /steel|iron|refin|chemical|fertili|industrial|process heat/i,
  'Ammonia & e-Fuels': /ammonia|methanol|e-fuel|synthetic fuel|shipping|maritime/i,
  'Production & Technology': /electroly|production|manufactur|fuel cell|technology|capacity|mw|gw/i
};
const H2 = /hydrogen|wasserstoff|waterstof|h₂|h2\b|ammonia|e-saf|electroly|fuel cell|methanol|rfnbo/i;
const COMM = /offtake|agreement|contract|investment|financ|funding|grant|fid|auction|subsid|policy|regulation|capacity|mw|gw|tonne|production|construction|commission|pipeline|network|storage|terminal|import|export|ammonia|methanol|e-saf|steel|refin|electroly|cancel|delay|bankrupt|acqui|stake|price|cost|project|buyer|\bplan\b|output/i;
const EXCL = /webinar|conference|podcast|\bawards?\b|\bjobs?\b|vacanc|keynote|training|opinion:|newsletter|market report|cagr/i;
const REGIONS = {
  Germany: /germany|german|deutsch|berlin|essen|hamburg|bavaria|nrw/i,
  Benelux: /netherlands|dutch|nederland|belgium|rotterdam|antwerp|ghent|waterstof/i,
  Nordics: /sweden|norway|denmark|finland|iceland|nordic/i,
  'UK & Ireland': /united kingdom|britain|british|england|scotland|wales|ireland| uk\b/i,
  'Other Europe': /spain|france|italy|portugal|greece|poland|austria|europe|eu\b|brussels/i,
  'Middle East': /saudi|oman|uae|emirates|qatar|middle east/i,
  Africa: /africa|mauritania|namibia|morocco|egypt/i,
  'Asia-Pacific': /china|japan|korea|india|australia|asia/i,
  'North America': /united states|usa|u\.s\.|canada|california|texas/i,
  'Latin America': /chile|brazil|argentina|paraguay|latin america/i
};
const SIGNALS = [
  [/final investment decision|\bfid\b/i, 6],
  [/offtake|supply agreement|purchase agreement|sales agreement|supply deal|framework agreement|memorandum|\bmou\b|letter of intent/i, 4],
  [/contract|awarded|\border(s|ed)?\b(?! to)|selected|signs?\b|signed/i, 2],
  [/[€$£]\s?\d|\b(usd|eur|gbp)\s?\d|\b\d[\d.,]*\s?(million|billion|bn|mn)\b|\b\d[\d.,]*\s?(m|bn)\s?(€|\$|£|euro|dollar|pound)/i, 3],
  [/\b\d[\d.,]*\s?(mw|gw|kt|mtpa|ktpa|tpa|tonnes?|tons?)\b/i, 3],
  [/auction|subsid|state aid|tender|grant|funding|rfnbo|cbam|mandate|quota|h2global|hydrogen bank|ipcei|contracts? for difference|\bcfd\b|tax credit|45v/i, 3],
  [/cancel|delay|bankrupt|insolven|scrap|halt|withdraw|abandon|shelve|pause|write-?down|impairment|pull(s|ed|ing)? back|scal(e|es|ed|ing) back|trims?\b/i, 3],
  [/acqui|merger|takeover|stake|joint venture|partnership|invest/i, 2],
  [/pipeline|terminal|import|export|storage|cavern|electroly|construction|commission|start-?up|production|capacity/i, 1]
];
const MIN_SCORE = 4;
// Headline-only items (no feed summary) carry less text to score, so they need a lower bar.
const MIN_SCORE_HEADLINE_ONLY = 2;

function relevanceScore(a) {
  const text = a.title + ' ' + (a.summary || '');
  let s = H2.test(a.title) ? 2 : 0;
  for (const [re, w] of SIGNALS) if (re.test(text)) s += w;
  return s;
}

function prepare(raw) {
  const a = { title: raw.title, summary: raw.summary || '', link: raw.link, date: raw.date, source: raw.source, image: raw.image || '' };
  if (!a.title || !/^https?:\/\//i.test(a.link) || Number.isNaN(Date.parse(a.date))) return null;
  const t = a.title + ' ' + a.summary;
  if (!H2.test(t) || !COMM.test(t) || EXCL.test(t)) return null;
  a.score = relevanceScore(a);
  if (a.score < (a.summary ? MIN_SCORE : MIN_SCORE_HEADLINE_ONLY)) return null;
  a.topic = Object.entries(TOPICS).find(x => x[1].test(t))?.[0] || 'Other Hydrogen News';
  a.region = Object.entries(REGIONS).find(x => x[1].test(t))?.[0] || 'Global';
  a.date = new Date(a.date).toISOString();
  return a;
}

function canonicalUrl(value) {
  try {
    const u = new URL(value);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_.+|fbclid|gclid|msclkid|mc_cid|mc_eid)$/i.test(k)) u.searchParams.delete(k);
    u.searchParams.sort();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.href;
  } catch { return ''; }
}
const normalizedTitle = t => t.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function dedupe(list) {
  const urls = new Set(), titles = new Set();
  return [...list].sort((a, b) => new Date(b.date) - new Date(a.date) || b.score - a.score).filter(a => {
    const u = canonicalUrl(a.link), t = normalizedTitle(a.title);
    const dup = urls.has(u) || titles.has(t);
    urls.add(u); titles.add(t);
    return u && t && !dup;
  });
}

function windowStart(days, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}
