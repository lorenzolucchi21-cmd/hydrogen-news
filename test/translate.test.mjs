import test from 'node:test';
import assert from 'node:assert/strict';
import { translateText, translateHeadlines } from '../scripts/translate.mjs';

const reply = (translatedText, extra = {}) => async () => new Response(JSON.stringify({ responseData: { translatedText }, responseStatus: 200, ...extra }), { status: 200 });
const article = (title, lang, date = '2026-10-20T10:00:00Z', extra = {}) => ({ title, lang, date, ...extra });
const noWait = async () => {};

test('translates a headline and sends the right language pair', async () => {
  let url;
  const out = await translateText('EWE und Verbund planen Wasserstoff-Elektrolyseur – Projekt', 'de', {
    fetchImpl: async u => { url = u; return reply('ewe and Verbund plan a hydrogen electrolyser &amp; project')(); }
  });
  assert.match(url, /langpair=de\|en/);
  assert.ok(!decodeURIComponent(url).includes('–'));
  assert.equal(out, 'Ewe and Verbund plan a hydrogen electrolyser & project');
});

test('quota messages and bad output are rejected', async () => {
  await assert.rejects(translateText('Wasserstoff', 'de', { fetchImpl: reply('MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY') }), /quota/);
  await assert.rejects(translateText('Wasserstoff', 'de', { fetchImpl: async () => new Response('', { status: 429 }) }), /quota/);
  await assert.rejects(translateText('Wasserstoff', 'de', { fetchImpl: reply('') }), /unusable/);
  await assert.rejects(translateText('Wasserstoff', 'de', { fetchImpl: async () => new Response('', { status: 500 }) }), /HTTP 500/);
});

test('only untranslated non-English headlines are translated, newest first, within the limit', async () => {
  const seen = [];
  const articles = [
    article('Alt', 'de', '2026-10-01T00:00:00Z'), article('Neu', 'de', '2026-10-21T00:00:00Z'),
    article('English headline', 'en'), article('Schon fertig', 'de', '2026-10-20T00:00:00Z', { titleEn: 'Done' }), article('Nieuw', 'nl', '2026-10-19T00:00:00Z')
  ];
  const result = await translateHeadlines(articles, {
    max: 2, wait: noWait,
    fetchImpl: async u => { seen.push(decodeURIComponent(new URL(u).searchParams.get('q'))); return reply('Translated ' + seen.length)(); }
  });
  assert.deepEqual(seen, ['Neu', 'Nieuw']);
  assert.deepEqual(result, { translated: 2, failed: 0, remaining: 1 });
  assert.equal(articles[2].titleEn, undefined);
  assert.equal(articles[3].titleEn, 'Done');
});

test('a failing headline is skipped, and a quota error stops translation without losing earlier results', async () => {
  const logs = [];
  const articles = [article('Eins', 'de', '2026-10-21T00:00:00Z'), article('Zwei', 'de', '2026-10-20T00:00:00Z'), article('Drei', 'de', '2026-10-19T00:00:00Z'), article('Vier', 'de', '2026-10-18T00:00:00Z')];
  const calls = ['ok', 'fail', 'quota'];
  const result = await translateHeadlines(articles, {
    wait: noWait, log: m => logs.push(m),
    fetchImpl: async () => {
      const kind = calls.shift();
      if (kind === 'fail') return new Response('', { status: 500 });
      if (kind === 'quota') return new Response('', { status: 429 });
      return reply('One')();
    }
  });
  assert.equal(articles[0].titleEn, 'One');
  assert.equal(articles[1].titleEn, undefined);
  assert.equal(articles[3].titleEn, undefined);
  assert.equal(result.translated, 1);
  assert.equal(result.remaining, 3);
  assert.equal(logs.length, 1);
});
