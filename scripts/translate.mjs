import { setTimeout as sleep } from 'node:timers/promises';
import * as heModule from 'he';

const he = heModule.default ?? heModule;

class QuotaError extends Error {}

// Free MyMemory translation service. Only public headlines are sent; nothing is sent from the visitor's browser.
export async function translateText(text, lang, { fetchImpl = fetch } = {}) {
  const q = text.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const r = await fetchImpl(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${lang}|en`, { signal: AbortSignal.timeout(15000) });
  if (r.status === 429) throw new QuotaError('quota');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const raw = String(j.responseData?.translatedText ?? '');
  if (j.quotaFinished || String(j.responseStatus) === '429' || /MYMEMORY WARNING/i.test(raw)) throw new QuotaError('quota');
  const out = he.decode(raw).replace(/\s+/g, ' ').trim();
  if (!out || /INVALID|QUERY LENGTH|PLEASE SELECT/i.test(out) || out.length > q.length * 3 + 40) throw new Error('unusable translation');
  return out[0].toUpperCase() + out.slice(1);
}

// Best effort: a headline that cannot be translated keeps its original text and is retried in the next run.
export async function translateHeadlines(articles, { max = 120, delayMs = 300, fetchImpl, wait = sleep, log = console.log } = {}) {
  const pending = articles.filter(a => a.lang && a.lang !== 'en' && !a.titleEn);
  const todo = [...pending].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, max);
  let translated = 0, failed = 0;
  for (const a of todo) {
    try {
      a.titleEn = await translateText(a.title, a.lang, { fetchImpl });
      translated++;
    } catch (e) {
      failed++;
      if (e instanceof QuotaError) {
        log('Translation quota reached; remaining headlines will be translated in a later run.');
        break;
      }
    }
    await wait(delayMs);
  }
  return { translated, failed, remaining: pending.length - translated };
}
