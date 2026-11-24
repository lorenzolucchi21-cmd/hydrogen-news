import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const S = new Function(`${read('../src/shared.js')}\n${read('../src/companies.js')}; return { insightStories, companyMatches, companyStories, companyStoryTypes, watchSignal, COMPANIES, COMPANY_GROUPS, OFFTAKE_INDUSTRIES };`)();
const now = new Date(2026, 10, 24, 12);
const story = (title, day = 0, extra = {}) => ({
  title, summary: '', source: 'Example', topic: 'Offtake & Supply', region: 'Germany',
  link: 'https://example.com/' + encodeURIComponent(title),
  date: new Date(2026, 10, 24 - day, 10).toISOString(), ...extra
});
const company = name => S.COMPANIES.find(c => c.name === name);

test('company watch uses a 30-day window and groups reports of the same event', () => {
  const first = story('EWE and Verbund jointly build 500 MW electrolyser in Nordenham', 1);
  const duplicate = story('EWE and Verbund jointly build 500 MW electrolyser in Nordenham', 2, { source: 'Another source' });
  const old = story('Hydrogen auction opens in Spain', 30);
  const future = story('Hydrogen funding in India', 0, { date: new Date(2026, 10, 24, 13).toISOString() });
  const result = S.insightStories([old, duplicate, first, future], now);
  assert.equal(result.length, 1);
  assert.equal(result[0].also.length, 1);
});

test('company names match headlines, translations and summaries without substring false positives', () => {
  assert.ok(S.companyMatches(story('RWE signs a contract'), company('RWE')));
  assert.ok(S.companyMatches(story('German headline', 0, { titleEn: 'Lhyfe expands production' }), company('Lhyfe')));
  assert.ok(S.companyMatches(story('Hydrogen project update', 0, { summary: 'The developer is EWE.' }), company('EWE')));
  assert.equal(S.companyMatches(story('Hydrogen tank shell tested'), company('Shell')), false);
  assert.equal(S.companyMatches(story('A new hydrogen project'), company('EWE')), false);
  assert.equal(S.companyMatches(story('A panel about hydrogen'), company('Nel')), false);
  assert.ok(S.companyMatches(story('Nel Hydrogen wins an order'), company('Nel')));
});

test('company watch finds mentions in grouped alternate reports only once', () => {
  const lead = story('Partners plan 500 MW electrolyser');
  const alternate = story('RWE joins 500 MW electrolyser project', 1);
  const result = S.companyStories([{ ...lead, also: [alternate] }], company('RWE'));
  assert.equal(result.length, 1);
  assert.equal(result[0].title, alternate.title);
});

test('story type badges distinguish equipment deals and explicit hydrogen production', () => {
  assert.deepEqual(S.companyStoryTypes(story('Siemens Energy wins electrolyser supply contract')), ['Equipment / technology mentioned']);
  assert.deepEqual(S.companyStoryTypes(story('Lhyfe develops hydrogen production project')), ['Hydrogen production mentioned']);
  assert.deepEqual(S.companyStoryTypes(story('Plug Power supplies electrolyser for hydrogen production project')), ['Equipment / technology mentioned', 'Hydrogen production mentioned']);
  assert.deepEqual(S.companyStoryTypes(story('RWE awarded contracts for hydrogen-ready gas-fired power plants')), ['Other update']);
  assert.deepEqual(S.companyStoryTypes(story('Plug Power supplies electrolyser for hydrogen project')), ['Equipment / technology mentioned']);
  assert.deepEqual(S.companyStoryTypes(story('thyssenkrupp nucera launches electrolyser cell assembly hub to support hydrogen production')), ['Hydrogen production mentioned']);
  assert.deepEqual(S.companyStoryTypes(story('Company names new chief executive')), ['Other update']);
});

test('company roles include both supply and demand where supported', () => {
  assert.ok(company('TotalEnergies').groups.includes(S.COMPANY_GROUPS[0]));
  assert.ok(company('TotalEnergies').groups.includes(S.COMPANY_GROUPS[2]));
  assert.ok(company('Stegra').groups.includes(S.COMPANY_GROUPS[0]));
  assert.ok(company('Stegra').groups.includes(S.COMPANY_GROUPS[2]));
  assert.ok(company('Plug Power').groups.includes(S.COMPANY_GROUPS[0]));
  assert.ok(company('Plug Power').groups.includes(S.COMPANY_GROUPS[1]));
  assert.deepEqual(company('Airbus').groups, [S.COMPANY_GROUPS[3]]);
});

test('thyssenkrupp subsidiaries are separate and unqualified mentions are not assigned', () => {
  const steel = company('thyssenkrupp Steel');
  const nucera = company('thyssenkrupp nucera');
  assert.deepEqual(steel.groups, [S.COMPANY_GROUPS[2]]);
  assert.deepEqual(nucera.groups, [S.COMPANY_GROUPS[1]]);
  assert.ok(S.companyMatches(story('thyssenkrupp Steel plans hydrogen use'), steel));
  assert.ok(S.companyMatches(story('thyssenkrupp nucera supplies an electrolyser'), nucera));
  for (const c of [steel, nucera]) assert.equal(S.companyMatches(story('thyssenkrupp announces a project'), c), false);
  assert.equal(S.companyMatches(story('thyssenkrupp nucera supplies an electrolyser'), steel), false);
  assert.equal(S.companyMatches(story('thyssenkrupp Steel plans hydrogen use'), nucera), false);
});

test('offtake examples link to tracked direct users or projects, not downstream aircraft makers', () => {
  const industries = new Map(S.OFFTAKE_INDUSTRIES.map(i => [i.name, i.companies]));
  assert.ok(industries.get('Iron & steel').includes('thyssenkrupp Steel'));
  assert.ok(industries.get('Ammonia & fertilisers').includes('Yara'));
  assert.ok(industries.get('Synthetic fuels').includes('Arcadia eFuels'));
  for (const names of industries.values()) {
    for (const name of names) {
      assert.ok(company(name), `${name} must be a tracked company`);
      assert.ok(company(name).groups.includes(S.COMPANY_GROUPS[2]), `${name} must have a user or project role`);
      assert.notEqual(name, 'Airbus');
    }
  }
});

test('Omterra and the former Siemens Energy name lead to the same technology provider', () => {
  const c = company('Omterra (Siemens Energy)');
  assert.ok(S.companyMatches(story('Siemens Energy wins an electrolyser contract'), c));
  assert.ok(S.companyMatches(story('Omterra launches an electrolyser'), c));
});

test('progress needs evidence of an action, not merely a hoped-for deal', () => {
  assert.equal(S.watchSignal(story('Hydrogen project awaits offtake deals and financing')), null);
  assert.equal(S.watchSignal(story('Uniper signs offtake deal with Arcadia')), 'positive');
  assert.equal(S.watchSignal(story('Developer cancels electrolyser project')), 'negative');
  assert.equal(S.watchSignal(story('Firm signs deal but cancels second project')), null);
});
