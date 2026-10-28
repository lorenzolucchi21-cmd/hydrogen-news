// German (de) and Dutch (nl) terms are included so that headlines in those languages are classified too.
// Each topic has weighted rules. A match in the headline counts double; the topic with the highest total wins,
// ties go to the topic listed first, and a story with no real signal becomes "Other Hydrogen News".
const TOPICS = {
  'Investments & FIDs': [
    [/final investment decision|\bfid\b|investitionsentscheidung|investeringsbeslissing/i, 5],
    [/\braises?\b|\braised\b|series [a-e]\b|funding round|financing|finanzier|financier|\bequity\b|\bloans?\b|\bipo\b|\bstake\b|acquisition|\bacquires?\b|takeover|übernahme|beteilig|overname|kapital/i, 4],
    [/invest|\bgrants?\b|funding|förder|million|billion|millionen|milliarden|miljoen|miljard|[€$£]\s?\d/i, 1]
  ],
  'Offtake & Supply': [
    [/off-?take|supply (agreement|deal|contract)|purchase agreement|sales agreement|long-term (agreement|supply|contract)|abnahme|liefervertrag|liefervereinbarung|afname|\bbuyers?\b|procure|buys? (green |low-carbon )?(hydrogen|ammonia|e-?fuels?)|kauft bei|bezieht (grünen )?wasserstoff/i, 5],
    [/contract|agreement|vertrag|overeenkomst|\bsigns?\b|auftrag|opdracht/i, 1]
  ],
  'Policy & Auctions': [
    [/auction|hydrogen bank|contracts? for difference|\bcfd\b|state aid|rfnbo|cbam|ipcei|h2global|tax credit|\b45v\b|mandate|quota|auktion|ausschreibung|kernnetz|differenzvertr|aanbesteding/i, 5],
    [/policy|regulat|government|ministry|minister|\bbmw[a-z]{1,2}\b|bundesministerium|ministerium|parliament|legislat|\blaw\b|bundesregierung|regierung|gesetz|beleid|overheid|european commission|eu commission|\bsubsid|subsidie|förderprogramm|(10|ten|zehn)-?(point|punkte)/i, 3]
  ],
  'Infrastructure & Storage': [
    [/pipeline|kernnetz|cavern|storage|speicher|opslag|terminal|corridor|wasserstoffleitung|gasleitung|rohrleitung/i, 4],
    [/infrastructure|network|\bhubs?\b|\bports?\b|filling station|refuelling|refueling|tankstelle|tankstation|wasserstoffnetz|netz\b/i, 2]
  ],
  'Aviation & e-SAF': [
    [/\be-?saf\b|\besaf\b|sustainable aviation fuel|\bsaf\b|jet fuel|synthetic (jet |aviation )?kerosene|e-?kerosene|kerosin|luftfahrt|luchtvaart/i, 5],
    [/aviation|airline|aircraft|airport|flugzeug|vliegtuig|luchthaven|flughafen/i, 3]
  ],
  'Steel & Industry': [
    [/\bsteel|stahl|\bstaal|refiner|raffinaderij|raffinerie|\bdri\b|direct reduced iron/i, 4],
    [/chemical|fertili|cement|zement|\bglass\b|process heat|\bindustrial\b|\bindustry\b|industrie|chemie|\biron\b/i, 1]
  ],
  'Ammonia & e-Fuels': [
    [/ammonia|ammoniak|methanol|\be-?fuels?\b|\befuels?\b|synthetic fuel|power-to-liquid|\bptl\b/i, 4],
    [/shipping|maritime|vessel|\bships?\b|marine|schiff|scheepvaart/i, 3]
  ],
  'Production & Technology': [
    [/electrolys|electrolyz|elektrolys/i, 2],
    [/fuel cell|brennstoffzell|brandstofcel|\bstacks?\b/i, 2],
    [/production|produktion|productie|capacity|kapazität|capaciteit|manufactur|gigafactory|\bfactory|\bfabrik|fabriek/i, 1],
    [/construction|commission|inbetriebnahme|baubeginn|\bplant\b|\banlage\b|facility/i, 1],
    [/\b\d[\d.,]*[\s-]?(mw|gw)\b/i, 1],
    [/technolog/i, 1]
  ]
};
const TOPIC_MIN_SCORE = 2;
function topicOf(title, summary = '') {
  let best = 'Other Hydrogen News', top = TOPIC_MIN_SCORE - 1;
  for (const [name, rules] of Object.entries(TOPICS)) {
    let score = 0;
    for (const [re, w] of rules) score += re.test(title) ? w * 2 : re.test(summary) ? w : 0;
    if (score > top) { best = name; top = score; }
  }
  return best;
}
// "electrolys" deliberately does not match "electrolyte" (battery chemistry).
const H2 = /hydrogen|wasserstoff|waterstof|h₂|\bh2\b|\bh2-|h2global|ammonia|ammoniak|\be-?saf\b|\besaf\b|\be-?fuels?\b|\be-?kerosene|\be-?methanol|power-to-liquid|\bptl\b|synthetic (green |sustainable |renewable )?(jet |aviation )?(fuels?|kerosene)|(green|renewable|sustainable) jet fuel|sustainable aviation fuel|electrolys|electrolyz|elektrolys|fuel cells?|brennstoffzell|brandstofcel|methanol|rfnbo/i;
// Companies whose news is hydrogen/e-fuel news even when the headline has no hydrogen keyword. Edit freely.
const WATCH = /arcadia e-?fuels|reverion|sunfire|electric hydrogen|thyssenkrupp nucera|\bnucera\b|plug power|\bitm power\b|\blhyfe\b|\bhy24\b|\bhh2e\b|ohmium|enapter|hexagon purus|bloom energy|ballard power|nel asa|nel hydrogen/i;
const COMM = /off-?take|agreement|contract|investment|financ|funding|grant|fid|auction|subsid|policy|regulation|capacity|mw|gw|tonne|production|construction|commission|pipeline|network|storage|terminal|import|export|ammonia|methanol|e-?saf|esaf|steel|refin|electrolys|electrolyz|cancel|delay|bankrupt|acqui|stake|price|cost|project|buyer|\bplan\b|output|\bdeals?\b|joint venture|\bsigns?\b|million|billion|invest|vertrag|abnahme|förder|projekt|anlage|kraftwerk|fabrik|werk\b|stahl|raffiner|elektrolys|millionen|milliarden|übernahme|beteilig|insolvenz|genehmig|ausschreibung|vereinbarung|gründen|planen|produktion|kapazität|kernnetz|speicher|investering|subsidie|overeenkomst|opdracht|fabriek|miljoen|miljard|faillissement|vergunning|productie|capaciteit/i;
const EXCL = /webinar|conference|podcast|\bawards?\b|job (openings?|postings?|listings?)|\bcareers?\b|vacanc|keynote|training|opinion:|newsletter|market (report|size|research|share|forecast|outlook|trends)|\bcagr\b|to reach \$|konferenz|auszeichnung|stellenangebot|stellenanzeige|\bkarriere|vacature|congres|\(m\/w\/d\)|\(f\/m\/d\)|\bproject manager\b|\s-\s\d{5,}$|\baktie\b|\bkursziel|\bprice target\b|\bstock\b|shares (jump|surge|fall|rise|soar)|nickel-hydrogen/i;
const BATTERY = /lithium|solid-state|batter(y|ies)|batterie|\bakku/i;
const CORE_H2 = /hydrogen|wasserstoff|waterstof|electrolys|electrolyz|elektrolys|\be-?fuels?\b|\be-?saf\b|\besaf\b|ammonia|methanol/i;
// Research and laboratory news is deprioritised: the focus is on deals, investments and policy.
const NICHE = /\b(researchers?|scientists?|study|studies|university|universities|laborator\w*|prototype|breakthrough|patents?|peer-reviewed|simulation|catalysts?|membranes?|novel|forscher|studie|universität|hochschule|patente?|onderzoek\w*|universiteit|molecular|nano\w*|photo(catal|electro)\w*|electrocatal\w*|perovskite|graphene|enzymes?|bacteri\w*|algae|quantum)\b|\w*forschung\w*|fraunhofer|helmholtz|max[- ]planck|science news|\b(launch|unveil|introduc)\w*[^.]{0,60}\b(module|stack|platform|generation)\b/i;
// Stories written in German or Dutch are filed under Germany and Benelux. For other languages the region with the most
// keyword matches wins; stories without any location keyword are "Global".
const REGIONS = {
  Germany: /germany|german\b|deutsch|\bberlin\b|\bessen\b|hamburg|bavaria|bayern|\bnrw\b|nordenham|niedersachsen|düsseldorf|lower saxony|north rhine/i,
  Benelux: /netherlands|dutch|nederland|niederlande|belgium|belgian|belgien|luxembourg|rotterdam|antwerp|ghent|waterstof/i,
  Nordics: /sweden|swedish|norway|norwegian|denmark|danish|finland|finnish|iceland|nordic|schweden|norwegen|dänemark/i,
  'UK & Ireland': /united kingdom|britain|british|england|scotland|scottish|\bwales\b|\bireland\b|irish|\bU\.?K\.?\b/,
  'Other Europe': /spain|spanish|spanien|france|french|frankreich|italy|italian|italien|portugal|portuguese|greece|greek|poland|polish|austria|österreich|switzerland|swiss|europe|europa|\b(eu|e\.u\.)\b|brussels/i,
  'Middle East': /saudi|\boman\b|omani|\buae\b|emirates|emirati|qatar|middle east/i,
  Africa: /africa|mauritania|namibia|morocco|moroccan|\begypt|egyptian|\bkenya|\bnigeria/i,
  'Asia-Pacific': /\bchina\b|chinese|\bjapan|korea|\bindia\b|indian\b|australia|\basia\b|singapore|indonesia/i,
  'North America': /united states|\busa\b|\bu\.s\.|\bus\b(?= (government|state|doe|department|navy|energy))|american|canada|canadian|california|texas|\bdoe\b/i,
  'Latin America': /\bchile\b|chilean|brazil|argentin|paraguay|uruguay|colombia|latin america/i
};
function keywordRegion(text) {
  let best = 'Global', top = 0;
  for (const [name, re] of Object.entries(REGIONS)) {
    const n = (text.match(new RegExp(re.source, re.flags.includes('i') ? 'gi' : 'g')) || []).length;
    if (n > top) { best = name; top = n; }
  }
  return best;
}
function regionOf(text, lang) {
  if (lang === 'de') return 'Germany';
  if (lang === 'nl') return 'Benelux';
  return keywordRegion(text);
}

// ---- Market priority -----------------------------------------------------------------------------------------
// RWE's core markets (Germany, the Netherlands, the UK and Denmark) come first, then the rest of Europe/the EU.
// Any mention counts, so a story about an export project that names Germany as the buyer is a core-market story too.
// German and Dutch stories count as core unless they are clearly about a region outside Europe.
const CORE_MARKETS = [
  /germany|german\b|deutsch|\bberlin\b|hamburg|bavaria|bayern|\bnrw\b|nordenham|niedersachsen|düsseldorf|wilhelmshaven|\bemden\b|salzgitter|\bleuna\b/i,
  /netherlands|dutch|nederland|niederlande|rotterdam|amsterdam|groningen|eemshaven|\bholland\b/i,
  /united kingdom|britain|british|england|scotland|scottish|\bwales\b|northern ireland|\bU\.?K\.?\b/,
  /denmark|danish|dänemark|danmark|esbjerg|copenhagen|aarhus|\bkøbenhavn/i
];
const OUTSIDE_EUROPE = new Set(['Middle East', 'Africa', 'Asia-Pacific', 'North America', 'Latin America']);
function marketOf(text, lang) {
  if (CORE_MARKETS.some(re => re.test(text))) return 'core';
  if (lang === 'de' || lang === 'nl') return OUTSIDE_EUROPE.has(keywordRegion(text)) ? 'other' : 'core';
  return [REGIONS['Other Europe'], REGIONS.Nordics, REGIONS.Benelux].some(re => re.test(text)) ? 'eu' : 'other';
}
const MARKET_BOOST = { core: 8, eu: 5, other: 0 };
const MARKET_PENALTY_OUTSIDE = 3;
// e-SAF and e-fuel stories keep their place wherever they happen, because they matter for offtake.
const KEEP_OUTSIDE = new Set(['Aviation & e-SAF', 'Ammonia & e-Fuels']);
// Order of stories on the page: commercial relevance, recency, and market priority.
function rankScore(a, now = Date.now()) {
  const age = (now - Date.parse(a.date)) / 864e5;
  const market = a.market || 'eu';
  let s = a.score + Math.max(0, 3 - age * 0.4) + MARKET_BOOST[market];
  if (market === 'other' && !KEEP_OUTSIDE.has(a.topic)) s -= MARKET_PENALTY_OUTSIDE;
  return s;
}
const SIGNALS = [
  [/final investment decision|\bfid\b|investitionsentscheidung|investeringsbeslissing/i, 6],
  [/off-?take|supply agreement|purchase agreement|sales agreement|supply deal|framework agreement|long-term (agreement|supply|contract)|memorandum|\bmou\b|letter of intent|abnahme|liefervertrag|liefervereinbarung|afnameovereenkomst|absichtserklärung|intentieverklaring/i, 4],
  [/contract|awarded|\border(s|ed)?\b(?! to)|selected|\bsigns?\b|signed|\bdeal\b|unterzeichn|\bvertrag|auftrag|zuschlag|overeenkomst|opdracht|tekent/i, 2],
  [/[€$£]\s?\d|\b(usd|eur|gbp)\s?\d|\b\d[\d.,]*\s?(million|billion|bn|mn|millionen|milliarden|mio\.?|mrd\.?|miljoen|miljard)\b|\b\d[\d.,]*\s?(m|bn)\s?(€|\$|£|euro|dollar|pound)/i, 3],
  [/\b\d[\d.,]*[\s-]?(mw|gw|kt|mtpa|ktpa|tpa|tonnes?|tons?|t\/y|tpd)\b/i, 3],
  [/auction|subsid|state aid|tender|grant|funding|rfnbo|cbam|mandate|quota|h2global|hydrogen bank|ipcei|contracts? for difference|\bcfd\b|tax credit|45v|förderung|förderbescheid|zuschuss|ausschreibung|auktion|kernnetz|subsidie|aanbesteding/i, 3],
  [/cancel|delay|bankrupt|insolven|scrap|halt|withdraw|abandon|shelve|pause|write-?down|impairment|pull(s|ed|ing)? back|scal(e|es|ed|ing) back|trims?\b|abgesagt|gestoppt|stoppt|verzögert|pleite|rückzug|faillissement|geannuleerd|uitgesteld/i, 3],
  [/acqui|merger|takeover|stake|joint venture|partnership|invest|übernahme|beteilig|gründen|partnerschaft|overname|samenwerking|investier|investition|investering/i, 2],
  [/refiner(y|ies)|raffiner|raffinaderij/i, 2],
  [/construction (starts?|begins?|started|begun|launch\w*)|(starts?|begins?|launch\w*) construction|break(s|ing)? ground|groundbreaking|inaugurat\w*|baubeginn|spatenstich|inbetriebnahme|in operation|commissioned/i, 2],
  [/\b(largest|biggest|world.s first|first-of-its-kind|größte[rn]?|grootste)\b/i, 1],
  [/\b(plans?|planned|planning|planen|geplant|projekte?n?|projects?)\b|elektrolyseur|electrolys[e]?r|electrolyzer/i, 1],
  [/pipeline|terminal|import|export|storage|cavern|electrolys|electrolyz|elektrolys|construction|commission|start-?up|production|capacity|baubeginn|inbetriebnahme|speicher|leitung|productie/i, 1]
];
const MIN_SCORE = 4;
// Headline-only items (no feed summary) carry less text to score, so they need a lower bar.
const MIN_SCORE_HEADLINE_ONLY = 3;

function parseNumber(s) {
  s = s.replace(/\s/g, '');
  if (/^\d{1,3}(,\d{3})+$/.test(s)) return +s.replace(/,/g, '');
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return +s.replace(/\./g, '');
  return +s.replace(',', '.');
}
// Extra weight for big projects: at least 100 MW, or at least 100 million in money.
function scaleBonus(text) {
  for (const m of text.matchAll(/(\d[\d.,]*)[\s-]?(mw|gw)\b/gi)) {
    if (parseNumber(m[1]) * (m[2].toLowerCase() === 'gw' ? 1000 : 1) >= 100) return 2;
  }
  const inMillions = (num, unit) => {
    const n = parseNumber(num);
    if (!unit) return n / 1e6;
    return /^(bn|billion|milliard|mrd|miljard|b$)/i.test(unit) ? n * 1000 : n;
  };
  for (const m of text.matchAll(/[€$£]\s?(\d[\d.,]*)\s?(bn|billion|milliarden?|mrd|b|m|mn|million|millionen|mio)?(?![a-z])/gi)) {
    if (inMillions(m[1], m[2]) >= 100) return 2;
  }
  for (const m of text.matchAll(/(\d[\d.,]*)\s?(bn|billion|milliarden?|mrd|mn|million|millionen|mio|miljoen|miljard)(?![a-z])/gi)) {
    if (inMillions(m[1], m[2]) >= 100) return 2;
  }
  return 0;
}

function relevanceScore(a) {
  const text = a.title + ' ' + (a.summary || '');
  let s = (H2.test(a.title) || WATCH.test(a.title)) ? 2 : 0;
  for (const [re, w] of SIGNALS) if (re.test(text)) s += w;
  if (NICHE.test(text)) s -= 3;
  return s + scaleBonus(text);
}

const LANG_MARKERS = {
  de: /\b(und|der|die|das|den|dem|des|ein|eine|einen|für|mit|von|zu|zum|zur|im|auf|nicht|bei|nach|wird|werden|sind|ist|aus|gegen|planen|jetzt|neue|neuer|sollen|hier|wasserstoff\w*|elektrolyse\w*|brennstoffzelle\w*|millionen|milliarden|investition\w*|kraftwerk\w*)\b/gi,
  nl: /\b(het|een|van|voor|met|naar|wordt|zijn|ook|aan|niet|deze|dat|bij|nieuwe|krijgt|gaat|waterstof\w*|miljoen|miljard|elektrolyser\w*|investering\w*)\b/gi,
  en: /\b(the|and|for|with|of|to|in|on|is|are|as|by|at|from|new|its|will|plans?|signs?|deal|says|after|into)\b/gi
};
// Returns 'en', 'de' or 'nl'. `hint` (the language configured for the source) breaks ties and settles very short headlines.
function detectLang(text, hint = 'en') {
  const n = {};
  for (const k of Object.keys(LANG_MARKERS)) n[k] = (text.match(LANG_MARKERS[k]) || []).length;
  if (/[äöüß]/i.test(text)) n.de += 2;
  const best = n.de >= n.nl ? 'de' : 'nl';
  if (n[best] >= 2 && n[best] > n.en) return best;
  if ((hint === 'de' || hint === 'nl') && n[hint] >= 1 && n[hint] >= n.en) return hint;
  return n.de + n.nl + n.en === 0 ? hint : 'en';
}

// A story's own picture must be a plain web image address. Feed addresses (for example Google News RSS searches) are
// not pictures and must never be requested by a visitor's browser.
function cleanImage(value) {
  try {
    const u = new URL(value);
    if (!/^https?:$/.test(u.protocol) || u.username) return '';
    if (/(^|\.)news\.google\.com$/.test(u.hostname) && /^\/rss\b/.test(u.pathname)) return '';
    if (/\.(xml|rss|atom)$/i.test(u.pathname) || /\/(feed|rss)\/?$/i.test(u.pathname)) return '';
    return u.href;
  } catch { return ''; }
}

function prepare(raw, opts = {}) {
  const a = { title: raw.title, summary: raw.summary || '', link: raw.link, date: raw.date, source: raw.source, image: cleanImage(raw.image) };
  if (!a.title || !/^https?:\/\//i.test(a.link) || Number.isNaN(Date.parse(a.date))) return null;
  const t = a.title + ' ' + a.summary;
  if (!(H2.test(t) || WATCH.test(t)) || !COMM.test(t) || EXCL.test(t)) return null;
  if (BATTERY.test(t) && !CORE_H2.test(t)) return null;
  a.score = relevanceScore(a);
  if (a.score < (opts.minScore ?? (a.summary ? MIN_SCORE : MIN_SCORE_HEADLINE_ONLY))) return null;
  a.lang = detectLang(t, opts.lang);
  a.topic = topicOf(a.title, a.summary);
  a.region = regionOf(t, a.lang);
  a.market = marketOf(t, a.lang);
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

// ---- Stock photos ----------------------------------------------------------------------------------------------
// Stories without a picture of their own get a topical, openly licensed stock photo from the curated library
// (config/images.json). It shows the subject only; it is not a picture of the event itself.
const IMAGE_FALLBACK = 'hydrogen-general';
const IMAGE_RULES = [
  ['ship', /\b(ships?|vessels?|tankers?|shipping|maritime|carriers?|vlacs?|harbou?rs?|hafen|schiff\w*|scheepvaart|havens?)\b|port of |dual-fuel/i],
  ['aviation', /\be-?saf\b|\besaf\b|aviation|airlines?|aircraft|airports?|\bjet\b|kerosene|kerosin|flugzeug|flughafen|luchtvaart|vliegtuig/i],
  ['pipeline', /pipelines?|kernnetz|\bcaverns?\b|storage|speicher|opslag|\bgrid\b|\bnetwork|netz\b|terminal|compressor|leitung/i],
  ['mobility', /fuel cell (vehicle|car|truck|bus)|\bbus(es)?\b|\btrucks?\b|\btrains?\b|\bcars?\b|vehicles?|filling stations?|refuel\w*|tankstelle|tankstation|mobility|mobilit|\blkw\b|\bhgv\b|forklift|\bfcev\b/i],
  ['industry', /\bsteel|stahl|\bstaal|refiner|raffin|chemical|chemie|cement|zement|fertili[sz]er|ammonia|ammoniak|methanol|industr/i],
  ['renewables', /offshore wind|\bwind\b|solar|photovolt|renewable|windpark|erneuerbar/i],
  ['policy', /government|ministry|minister|parliament|regulat|\bpolicy|auction|subsid|bundesregierung|ministerium|european commission|\blaw\b|regierung|gesetz|beleid|state aid|hydrogen bank|(10|ten|zehn)-?(point|punkte)/i],
  ['electrolyser', /electrolys|electrolyz|elektrolys|\bplant\b|factory|production|\bstack\b|gigafactory|\b\d[\d.,]*[\s-]?(mw|gw)\b|anlage/i]
];
const TOPIC_IMAGE = {
  'Investments & FIDs': 'electrolyser', 'Offtake & Supply': 'pipeline', 'Policy & Auctions': 'policy', 'Infrastructure & Storage': 'pipeline',
  'Aviation & e-SAF': 'aviation', 'Steel & Industry': 'industry', 'Ammonia & e-Fuels': 'industry', 'Production & Technology': 'electrolyser'
};
const SUBJECT_RULES = IMAGE_RULES.filter(([cat]) => !['policy', 'electrolyser'].includes(cat));
function imageCategory(a) {
  if (a.topic === 'Aviation & e-SAF') return 'aviation';
  const title = (a.titleEn || a.title) + ' ' + a.title;
  if (a.topic === 'Policy & Auctions') {
    // A policy story about a clear subject (a pipeline, shipping, steel ...) shows that subject; the government
    // buildings are kept for general policy news, so the Policy pictures do not all look alike.
    for (const [cat, re] of SUBJECT_RULES) if (re.test(title)) return cat;
    return 'policy';
  }
  for (const text of [title, a.summary || '']) for (const [cat, re] of IMAGE_RULES) if (re.test(text)) return cat;
  return TOPIC_IMAGE[a.topic] || IMAGE_FALLBACK;
}
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// `used` holds the pictures already shown on the page, so neighbouring stories do not repeat a picture while the
// category still has an unused one. The choice is stable: the same story always starts from the same picture.
// When every photo of a category is already on the page, a related category is tried before any photo repeats.
const IMAGE_RELATED = {
  electrolyser: ['hydrogen-general', 'renewables', 'industry'], 'hydrogen-general': ['electrolyser', 'industry', 'renewables'],
  mobility: ['hydrogen-general'], pipeline: ['industry', 'hydrogen-general'], industry: ['pipeline', 'electrolyser'],
  renewables: ['electrolyser'], ship: ['industry'], aviation: [], policy: []
};
function pickImage(a, library, used = new Set()) {
  const category = imageCategory(a);
  const regional = pool => {
    // Photos tagged with regions (for example a parliament building) are used for stories from those regions;
    // other stories get the untagged photos of the category.
    const local = pool.filter(i => i.regions && i.regions.includes(a.region)), generic = pool.filter(i => !i.regions);
    return local.length ? local : generic.length ? generic : pool;
  };
  let pool = library.filter(i => i.cats.includes(category));
  if (!pool.length) pool = library.filter(i => i.cats.includes(IMAGE_FALLBACK));
  if (!pool.length) pool = library;
  if (!pool.length) return null;
  pool = regional(pool);
  const start = hashString(a.link || a.title);
  for (let k = 0; k < pool.length; k++) {
    const c = pool[(start + k) % pool.length];
    if (!used.has(c.id)) { used.add(c.id); return c; }
  }
  for (const rel of IMAGE_RELATED[category] || []) {
    const extra = library.filter(i => i.cats.includes(rel) && !i.regions && !used.has(i.id));
    if (extra.length) { const c = extra[start % extra.length]; used.add(c.id); return c; }
  }
  return pool[start % pool.length];
}

// ---- Same story, several publishers --------------------------------------------------------------------------
const GROUP_STOP = new Set(('the and for with from that this into over after about their will have has had are was were its new says say said ' +
  'hydrogen green project projects plant plants energy power company group deal deals signs signed sign agreement agreements ' +
  'wasserstoff grüner gruener projekt und der die das den dem des ein eine einen für mit von zu zum zur auf bei nach wird werden ist sind aus ' +
  'waterstof groene het een van voor met naar bij aan ook deze dat ' +
  'million billion millionen milliarden miljoen miljard euro euros europe europas').split(' '));
function storyTokens(a) {
  if (a._tk) return a._tk;
  const text = (a.titleEn || a.title).normalize('NFKC').toLowerCase();
  const set = new Set();
  for (const w of text.split(/[^\p{L}\p{N}]+/u)) {
    if (!w || GROUP_STOP.has(w)) continue;
    if (/^\d+$/.test(w) ? w.length >= 2 : w.length >= 3) set.add(w.length > 4 ? w.replace(/(s|es)$/, '') : w);
  }
  Object.defineProperty(a, '_tk', { value: set, enumerable: false });
  return set;
}
function sameStory(a, b) {
  if (Math.abs(Date.parse(a.date) - Date.parse(b.date)) > 5 * 864e5) return false;
  const x = storyTokens(a), y = storyTokens(b);
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared >= 3 && shared / Math.min(x.size, y.size) >= 0.6;
}
// `list` must be ordered best first: the first story of each group is the one shown; the others become `also`.
function groupSimilar(list) {
  const groups = [];
  for (const a of list) {
    const g = groups.find(x => sameStory(x.main, a));
    if (g) g.also.push(a); else groups.push({ main: a, also: [] });
  }
  return groups.map(g => ({ ...g.main, also: g.also }));
}

// ---- Deal-flow balance ---------------------------------------------------------------------------------------
// Positive deal signals versus setbacks, counted over stories (one per group of reports), as a simple momentum
// indicator. Keyword-based, so it is a rough guide and not a measurement.
const POSITIVE_SIGNAL = /final investment decision|\bfid\b|investitionsentscheidung|investeringsbeslissing|off-?take|supply (agreement|deal|contract)|purchase agreement|sales agreement|long-term (agreement|supply|contract)|binding agreement|framework agreement|heads of terms|\bsigns?\b|\bsigned\b|\bselects?\b|\bselected\b|\bawarded\b|\bwins?\b|\bsecures?\b|\bsecured\b|\braises?\b(?! (concerns|questions|doubts|alarm))|\braised\b|series [a-e]\b|financing|(receives?|granted|approved|approves?)\b.{0,30}(funding|grant|subsid|permit|licen|approval)|construction (starts?|begins?|started|begun|launched?)|(starts?|begins?|launch\w*|breaks?) (construction|ground)|groundbreaking|inaugurat\w*|\bcommissioned\b|joint venture|\border(s|ed)?\b(?! to)|\bcontracts?\b|ring-?fenc\w*|launch\w* (.{0,25})?(funding|programme|program|tender|auction)|(starts?|begins?|begun|launch\w*) (\w+ ){0,2}(production|operations?|installation)|installation begins|enters? (commercial )?operation|commercial operation|goes? (live|online)|takes? delivery|\bdelivered\b|beauftragt|unterzeichn\w*|\berhält\b|gegründet|\bgründen\b|baubeginn|spatenstich|inbetriebnahme|\btekent\b|\bkrijgt\b|toegekend|\bbestelt\b|zuschlag|\bauftrag/i;
const NEGATIVE_SIGNAL = /cancel\w*|scrap(s|ped|ping)?\b|shelve\w*|\bhalts?\b|\bhalted\b|withdr[ae]w\w*|pull(s|ed|ing)? (out|back)|\bdelay\w*|postpone\w*|insolven\w*|bankrupt\w*|write-?downs?|impairment|lay-?offs?|job cuts|redundanc\w*|scal(e|es|ed|ing) back|abandon\w*|\bpauses?\b|\bpaused\b|falls? short|struggl\w*|\bcuts?\b.{0,20}(subsid|support|funding|target)|water(s|ed|ing)? down|roll(s|ed|ing)? back|weaken\w*|\bfails?\b|\bfailed\b|\bsuspend\w*|abgesagt|\babsage|gestoppt|\bstoppt|verzögert|verschoben|\bpleite|rückzug|stellenabbau|scheitert|gescheitert|faillissement|geannuleerd|uitgesteld|stopgezet|ingetrokken|trekt zich terug|hinter erwartungen zurück/i;
// Returns 'positive', 'negative' or null (neutral, or mixed signals). The headline decides; the summary is used
// only when the headline has no signal at all.
function dealSignal(a) {
  const judge = text => {
    const pos = POSITIVE_SIGNAL.test(text), neg = NEGATIVE_SIGNAL.test(text);
    return pos && neg ? 'mixed' : pos ? 'positive' : neg ? 'negative' : null;
  };
  const s = judge(a.title + ' ' + (a.titleEn || '')) ?? judge(a.summary || '');
  return s === 'positive' || s === 'negative' ? s : null;
}
const FLOW_MIN_STORIES = 8;
function dealFlow(stories, now = new Date()) {
  const day = 864e5, end = now.getTime();
  const tally = (from, to) => {
    let pos = 0, neg = 0;
    for (const a of stories) {
      const t = Date.parse(a.date);
      if (!(t >= from && t < to)) continue;
      const s = dealSignal(a);
      if (s === 'positive') pos++; else if (s === 'negative') neg++;
    }
    const n = pos + neg;
    return { pos, neg, n, balance: n ? Math.round(100 * (pos - neg) / n) : null };
  };
  const current = tally(end - 7 * day, end + 1), previous = tally(end - 14 * day, end - 7 * day);
  return {
    current, previous,
    reliable: current.n >= FLOW_MIN_STORIES,
    delta: current.n >= FLOW_MIN_STORIES && previous.n >= FLOW_MIN_STORIES ? current.balance - previous.balance : null
  };
}
