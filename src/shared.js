// German (de) and Dutch (nl) terms are included so that headlines in those languages are classified too.
const TOPICS = {
  'Investments & FIDs': /final investment decision|\bfid\b|invest|financ|funding|grant|stake|acquisition|million|billion|förder|übernahme|beteilig|millionen|milliarden|miljoen|miljard/i,
  'Offtake & Supply': /off-?take|supply agreement|purchase agreement|long-term agreement|contract|procure|buyer|sales agreement|abnahme|liefervertrag|vertrag|afname/i,
  'Policy & Auctions': /policy|regulation|auction|subsid|mandate|quota|state aid|rfnbo|cbam|government|auktion|ausschreibung|regierung|subsidie|beleid/i,
  'Infrastructure & Storage': /pipeline|network|terminal|storage|cavern|corridor|infrastructure|kernnetz|speicher|leitung|opslag/i,
  'Aviation & e-SAF': /\be-?saf\b|\besaf\b|sustainable aviation fuel|aviation|airline|aircraft|kerosin|luftfahrt|luchtvaart/i,
  'Steel & Industry': /steel|iron|refin|chemical|fertili|industrial|process heat|stahl|raffiner|staal|chemie/i,
  'Ammonia & e-Fuels': /ammonia|ammoniak|methanol|\be-?fuels?\b|synthetic (jet |aviation )?(fuel|kerosene)|shipping|maritime/i,
  'Production & Technology': /electrolys|electrolyz|elektrolys|production|manufactur|fuel cell|brennstoffzell|technology|capacity|\d[\s-]?(mw|gw)\b|produktion|kapazität|productie/i
};
// "electrolys" deliberately does not match "electrolyte" (battery chemistry).
const H2 = /hydrogen|wasserstoff|waterstof|h₂|\bh2\b|\bh2-|h2global|ammonia|ammoniak|\be-?saf\b|\besaf\b|\be-?fuels?\b|\be-?kerosene|\be-?methanol|power-to-liquid|\bptl\b|synthetic (green |sustainable |renewable )?(jet |aviation )?(fuels?|kerosene)|(green|renewable|sustainable) jet fuel|sustainable aviation fuel|electrolys|electrolyz|elektrolys|fuel cells?|brennstoffzell|brandstofcel|methanol|rfnbo/i;
// Companies whose news is hydrogen/e-fuel news even when the headline has no hydrogen keyword. Edit freely.
const WATCH = /arcadia e-?fuels|reverion|sunfire|electric hydrogen|thyssenkrupp nucera|\bnucera\b|plug power|\bitm power\b|\blhyfe\b|\bhy24\b|\bhh2e\b|ohmium|enapter|hexagon purus|bloom energy|ballard power|nel asa|nel hydrogen/i;
const COMM = /off-?take|agreement|contract|investment|financ|funding|grant|fid|auction|subsid|policy|regulation|capacity|mw|gw|tonne|production|construction|commission|pipeline|network|storage|terminal|import|export|ammonia|methanol|e-?saf|esaf|steel|refin|electrolys|electrolyz|cancel|delay|bankrupt|acqui|stake|price|cost|project|buyer|\bplan\b|output|\bdeals?\b|joint venture|\bsigns?\b|million|billion|invest|vertrag|abnahme|förder|projekt|anlage|kraftwerk|fabrik|werk\b|stahl|raffiner|elektrolys|millionen|milliarden|übernahme|beteilig|insolvenz|genehmig|ausschreibung|vereinbarung|gründen|planen|produktion|kapazität|kernnetz|speicher|investering|subsidie|overeenkomst|opdracht|fabriek|miljoen|miljard|faillissement|vergunning|productie|capaciteit/i;
const EXCL = /webinar|conference|podcast|\bawards?\b|job (openings?|postings?|listings?)|\bcareers?\b|vacanc|keynote|training|opinion:|newsletter|market (report|size|research|share|forecast|outlook|trends)|\bcagr\b|to reach \$|konferenz|auszeichnung|stellenangebot|stellenanzeige|\bkarriere|vacature|congres|\(m\/w\/d\)|\(f\/m\/d\)|\bproject manager\b|\s-\s\d{5,}$|\baktie\b|\bkursziel|\bprice target\b|stock (jumps|surges|falls|rises|soars)|shares (jump|surge|fall|rise|soar)|nickel-hydrogen/i;
const BATTERY = /lithium|solid-state|batter(y|ies)|batterie|\bakku/i;
const CORE_H2 = /hydrogen|wasserstoff|waterstof|electrolys|electrolyz|elektrolys|\be-?fuels?\b|\be-?saf\b|\besaf\b|ammonia|methanol/i;
// Research and laboratory news is deprioritised: the focus is on deals, investments and policy.
const NICHE = /\b(researchers?|scientists?|study|studies|university|universities|laborator\w*|prototype|breakthrough|patents?|peer-reviewed|simulation|catalysts?|membranes?|novel|forscher|studie|universität|hochschule|patente?|onderzoek\w*|universiteit|molecular|nano\w*|photo(catal|electro)\w*|electrocatal\w*|perovskite|graphene|enzymes?|bacteri\w*|algae|quantum)\b|\w*forschung\w*|\b(launch|unveil|introduc)\w*[^.]{0,60}\b(module|stack|platform|generation)\b/i;
const REGIONS = {
  Germany: /germany|german|deutsch|berlin|essen|hamburg|bavaria|bayern|nrw|nordenham|niedersachsen|düsseldorf/i,
  Benelux: /netherlands|dutch|nederland|niederlande|belgium|belgien|rotterdam|antwerp|ghent|waterstof/i,
  Nordics: /sweden|norway|denmark|finland|iceland|nordic|schweden|norwegen|dänemark/i,
  'UK & Ireland': /united kingdom|britain|british|england|scotland|wales|ireland| uk\b/i,
  'Other Europe': /spain|spanien|france|frankreich|italy|italien|portugal|greece|poland|austria|österreich|europe|europa|eu\b|brussels/i,
  'Middle East': /saudi|oman|uae|emirates|qatar|middle east/i,
  Africa: /africa|mauritania|namibia|morocco|egypt/i,
  'Asia-Pacific': /china|japan|korea|india|australia|asia/i,
  'North America': /united states|usa|u\.s\.|canada|california|texas/i,
  'Latin America': /chile|brazil|argentina|paraguay|latin america/i
};
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
// Returns 'en', 'de' or 'nl'. `hint` is used only when the text has no clear language markers.
function detectLang(text, hint = 'en') {
  const n = {};
  for (const k of Object.keys(LANG_MARKERS)) n[k] = (text.match(LANG_MARKERS[k]) || []).length;
  const best = n.de >= n.nl ? 'de' : 'nl';
  if (n[best] >= 2 && n[best] > n.en) return best;
  return n.de + n.nl + n.en === 0 ? hint : 'en';
}

function prepare(raw, opts = {}) {
  const a = { title: raw.title, summary: raw.summary || '', link: raw.link, date: raw.date, source: raw.source, image: raw.image || '' };
  if (!a.title || !/^https?:\/\//i.test(a.link) || Number.isNaN(Date.parse(a.date))) return null;
  const t = a.title + ' ' + a.summary;
  if (!(H2.test(t) || WATCH.test(t)) || !COMM.test(t) || EXCL.test(t)) return null;
  if (BATTERY.test(t) && !CORE_H2.test(t)) return null;
  a.score = relevanceScore(a);
  if (a.score < (opts.minScore ?? (a.summary ? MIN_SCORE : MIN_SCORE_HEADLINE_ONLY))) return null;
  a.topic = Object.entries(TOPICS).find(x => x[1].test(t))?.[0] || 'Other Hydrogen News';
  a.region = Object.entries(REGIONS).find(x => x[1].test(t))?.[0] || 'Global';
  a.lang = detectLang(t, opts.lang);
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
