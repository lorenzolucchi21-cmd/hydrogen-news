const COMPANY_GROUPS = ['Hydrogen supply & development', 'Electrolyser & technology providers', 'Hydrogen users & projects', 'Infrastructure & other'];
const COMPANIES = [
  { name: 'RWE', groups: [COMPANY_GROUPS[0]], aliases: [/\bRWE\b/], evidence: [['Hydrogen production: Lingen has delivered initial quantities during commissioning.', 'https://itm-power.com/news/first-hydrogen-from-lingen-reaches-customer']] },
  { name: 'Lhyfe', groups: [COMPANY_GROUPS[0]], aliases: [/\bLhyfe\b/i], evidence: [['Hydrogen producer with operating sites and projects in development.', 'https://www.h2-international.com/market/market-lhyfe-doubles-revenue-germany-and-brings-messer-board-shareholder']] },
  { name: 'Uniper', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[2]], aliases: [/\bUniper\b/i], evidence: [['Hydrogen and e-methanol project development: NorthStarH2 is a planned integrated project.', 'https://www.uniper.energy/sweden/power-plants-sweden/electrofuels/northstarh2']] },
  { name: 'EWE', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[3]], aliases: [/\bEWE\b/], evidence: [['Hydrogen production and infrastructure: operating electrolysis and storage projects in development.', 'https://www.ewe.com/en/shaping-energy-future/hydrogen-and-large-storage-facilities']] },
  { name: 'Air Liquide', groups: [COMPANY_GROUPS[0]], aliases: [/\bAir Liquide\b/i], evidence: [['Hydrogen production: projects include plants for TotalEnergies and a planned joint venture.', 'https://totalenergies.com/news/news/hydrogen-decarbonization-refineries-europe']] },
  { name: 'Arcadia eFuels', groups: [COMPANY_GROUPS[2]], aliases: [/\bArcadia\s+e-?fuels\b/i], evidence: [['Planned e-fuel production uses hydrogen as a feedstock.', 'https://arcadiaefuels.com/our-solution/']] },
  { name: 'Moeve', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[2]], aliases: [/\bMoeve\b/i], evidence: [['Hydrogen supply: Onuba is under construction.', 'https://www.moeveglobal.com/en/businesses/commercial-clean-energies/green-hydrogen/andalusian-valley'], ['E-fuels: a demonstration used renewable hydrogen for e-SAF.', 'https://www.moeveglobal.com/en/press/moeve-world2fly-aviation-decarbonisation-e-saf']] },
  { name: 'Plug Power', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[1]], aliases: [/\bPlug Power\b/i], evidence: [['Produces hydrogen and supplies electrolysers and fuel-cell technology.', 'https://www.plugpower.com/company-investors/']] },
  { name: 'thyssenkrupp nucera', groups: [COMPANY_GROUPS[1]], aliases: [/\b(?:thyssenkrupp\s+)?nucera\b/i], evidence: [['Supplies electrolysis technology.', 'https://www.thyssenkrupp-nucera.com/']] },
  { name: 'thyssenkrupp Steel', groups: [COMPANY_GROUPS[2]], aliases: [/\bthyssenkrupp\s+steel\b/i, /\bthyssen\s*krupp\s+steel\b/i], evidence: [['Steelmaking: Duisburg plans hydrogen use; the plant may initially run on natural gas.', 'https://www.thyssenkrupp-steel.com/en/company/sustainability/climate-strategy/climate-strategy.html']] },
  { name: 'Omterra (Siemens Energy)', groups: [COMPANY_GROUPS[1]], aliases: [/\bSiemens Energy\b/i, /\bOmterra\b/i], evidence: [['Supplies electrolysers; Omterra is the new joint brand of Siemens Energy and Siemens Gamesa.', 'https://www.omterra.com/global/en/home/products/pem-electrolyzers.html'], ['Brand transition and legal name.', 'https://www.omterra.com/global/en/home/company/siemens-energy-siemens-gamesa.html']] },
  { name: 'ITM Power', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[1]], aliases: [/\bITM Power\b/i], evidence: [['Electrolyser supplier; also offers hydrogen supply through its Hydropulse model.', 'https://itm-power.com/news/first-hydrogen-from-lingen-reaches-customer']] },
  { name: 'Sunfire', groups: [COMPANY_GROUPS[1]], aliases: [/\bSunfire\b/i], evidence: [['Supplies alkaline and solid oxide electrolysers.', 'https://sunfire.de/en/']] },
  { name: 'Nel', groups: [COMPANY_GROUPS[1]], aliases: [/\bNel (?:ASA|Hydrogen)\b/i], evidence: [['Supplies electrolyser systems.', 'https://nelhydrogen.com/']] },
  { name: 'Enapter', groups: [COMPANY_GROUPS[1]], aliases: [/\bEnapter\b/i], evidence: [['Supplies AEM electrolysers.', 'https://enapter.com/en/']] },
  { name: 'Topsoe', groups: [COMPANY_GROUPS[1]], aliases: [/\bTopsoe\b/i], evidence: [['Supplies solid oxide electrolysis technology.', 'https://www.topsoe.com/solutions/technologies/soec']] },
  { name: 'TotalEnergies', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[2]], aliases: [/\bTotalEnergies\b/i], evidence: [['Refineries use hydrogen; renewable hydrogen projects include joint ventures and third-party supply.', 'https://totalenergies.com/news/news/hydrogen-decarbonization-refineries-europe']] },
  { name: 'Shell', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[2]], aliases: [/\bShell\b/], evidence: [['Hydrogen production for its Rheinland energy and chemicals park.', 'https://www.shell.com/news-and-insights/our-stories/green-hydrogen-project-goes-live-in-germany.html'], ['REFHYNE II is planned to decarbonise site operations.', 'https://www.shell.com/what-we-do/shell-to-build-100-megawatt-renewable-hydrogen-electrolyser-in-germany.html']] },
  { name: 'Stegra', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[2]], aliases: [/\bStegra\b/i, /\bH2 Green Steel\b/i], evidence: [['Boden combines planned hydrogen production and steel use in one integrated project.', 'https://stegra.com/en/the-boden-plant']] },
  { name: 'Yara', groups: [COMPANY_GROUPS[0], COMPANY_GROUPS[2]], aliases: [/\bYara\b/i], evidence: [['Heroya produces hydrogen for ammonia and fertilisers.', 'https://www.yara.com/news-and-media/media-library/press-kits/renewable-hydrogen-plant-heroya-norway/']] },
  { name: 'Evonik', groups: [COMPANY_GROUPS[2]], aliases: [/\bEvonik\b/i], evidence: [['Initial hydrogen deliveries from Lingen reached its Marl chemical park during commissioning.', 'https://itm-power.com/news/first-hydrogen-from-lingen-reaches-customer']] },
  { name: 'Airbus', groups: [COMPANY_GROUPS[3]], aliases: [/\bAirbus\b/i], evidence: [['Develops hydrogen aircraft technology; not classified here as a hydrogen offtaker.', 'https://www.airbus.com/en/innovation/energy-transition/hydrogen']] }
];
const OFFTAKE_INDUSTRIES = [
  { name: 'Refining & biofuels', description: 'Hydrogen is used to process fuels, including in biorefineries.', companies: ['TotalEnergies', 'Shell'] },
  { name: 'Ammonia & fertilisers', description: 'Hydrogen is a feedstock for ammonia and nitrogen fertilisers.', companies: ['Yara'] },
  { name: 'Iron & steel', description: 'Hydrogen can replace coal or gas in direct reduction of iron ore.', companies: ['thyssenkrupp Steel', 'Stegra'] },
  { name: 'Chemicals & methanol', description: 'Chemical production uses hydrogen; e-methanol projects add another potential outlet.', companies: ['Evonik', 'Uniper'] },
  { name: 'Synthetic fuels', description: 'E-fuel producers combine hydrogen with carbon to make fuels such as e-SAF.', companies: ['Arcadia eFuels', 'Moeve'] }
];
function companyMatches(article, company) {
  const text = [article.title, article.titleEn, article.summary].filter(Boolean).join(' ');
  return company.aliases.some(alias => alias.test(text));
}
function companyStories(groups, company) {
  return groups.flatMap(group => {
    const matches = [group, ...(group.also || [])].filter(article => companyMatches(article, company));
    matches.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    return matches.length ? [matches[0]] : [];
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
function companyStoryTypes(article) {
  const text = [article.title, article.titleEn, article.summary].filter(Boolean).join(' ');
  const equipment = /electrolys(?:er|ers|eur|eure|is)|electrolyz(?:er|ers)|elektrolys(?:eur|eure|e)|fuel cell|brennstoffzell|technology|technologie/i.test(text);
  const deal = /\bsuppl(?:y|ies|ied)|\bsells?\b|\bsold\b|\bselect(?:s|ed)?\b|\border(?:s|ed)?\b|\bcontract|\bawarded\b|\bwins?\b|agreement|auftrag|liefer|bestellt|overeenkomst/i.test(text);
  const production = /(?:hydrogen|wasserstoff|waterstof)[ -]?(?:production|produktion|productie|erzeugung|plant|facility)\b|\b(?:production|producing|produces?|produced|produce|produktion|productie)\s+(?:of\s+)?(?:green\s+|renewable\s+|low-carbon\s+)?(?:hydrogen|wasserstoff|waterstof)\b/i.test(text);
  const types = [];
  if (equipment && deal) types.push('Equipment / technology mentioned');
  if (production) types.push('Hydrogen production mentioned');
  return types.length ? types : ['Other update'];
}
function watchSignal(article) {
  const signal = dealSignal(article);
  if (signal !== 'positive') return signal;
  const text = [article.title, article.titleEn, article.summary].filter(Boolean).join(' ');
  const progress = /\b(?:signs?|signed|secures?|secured|awarded|wins?|won|selected|commissions?|commissioned|starts?|started|launches|launched|begins?|began|completed|inaugurated|receives?|received|approved|approves?|acquires?|acquired|raises?|raised)\b|unterzeichn\w*|\berhält\b|beauftragt|baubeginn|inbetriebnahme|\btekent\b|\bkrijgt\b|toegekend|\bbestelt\b/i;
  return progress.test(text) ? signal : null;
}
