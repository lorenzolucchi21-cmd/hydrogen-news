const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = u => /^https?:\/\//i.test(u || '') ? u : '';
const dateLabel = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
let stories = [], chosen = COMPANIES[0].name, refreshNote = '';

function storyList(items, limit = 10, showTypes = false) {
  if (!items.length) return '<p class="empty-note">No matching stories in the last 30 days.</p>';
  return `<ul class="story-list">${items.slice(0, limit).map(a => `<li>
${showTypes ? `<div class="badges">${companyStoryTypes(a).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
<a href="${esc(safe(a.link))}" target="_blank" rel="noopener noreferrer">${esc(a.titleEn || a.title)}</a>
<div class="meta">${esc(a.source)} · ${dateLabel(a.date)} · ${esc(a.region)}</div></li>`).join('')}</ul>`;
}
function renderCompanies() {
  const query = $('companyFilter').value.trim().toLowerCase();
  const counts = new Map(COMPANIES.map(c => [c.name, companyStories(stories, c)]));
  $('companyGroups').innerHTML = COMPANY_GROUPS.map(group => {
    const companies = COMPANIES.filter(c => c.groups.includes(group) && c.name.toLowerCase().includes(query));
    return companies.length ? `<section class="company-group"><h3>${esc(group)}</h3><div class="company-buttons">${companies.map(c =>
      `<button type="button" class="company-button${c.name === chosen ? ' selected' : ''}" data-company="${esc(c.name)}" aria-pressed="${c.name === chosen}">
<span>${esc(c.name)}</span><span class="company-count">${counts.get(c.name).length}</span></button>`).join('')}</div></section>` : '';
  }).join('') || '<p class="empty-note">No companies match your search.</p>';
  const company = COMPANIES.find(c => c.name === chosen);
  const matches = counts.get(chosen);
  $('companyResults').innerHTML = `<div class="results-heading"><div><div class="k">Company watch</div><h3>${esc(chosen)}</h3>
<p>${esc(company.groups.join(' · '))}</p></div><span class="result-count">${matches.length} ${matches.length === 1 ? 'story' : 'stories'}</span></div>
<div class="company-evidence">${company.evidence.map(([note, url]) => `<p>${esc(note)} <a href="${esc(safe(url))}" target="_blank" rel="noopener noreferrer">Source ↗</a></p>`).join('')}</div>
${storyList(matches, 30, true)}${matches.length > 30 ? '<p>Showing the 30 most recent stories.</p>' : ''}`;
}
function renderIndustries() {
  $('industries').innerHTML = OFFTAKE_INDUSTRIES.map(industry => `<article class="industry-card">
<h3>${esc(industry.name)}</h3><p>${esc(industry.description)}</p><div class="industry-companies">
${industry.companies.map(name => `<button type="button" data-company="${esc(name)}">${esc(name)} <span aria-hidden="true">↗</span></button>`).join('')}
</div></article>`).join('');
}
function renderWatch() {
  const positive = stories.filter(a => watchSignal(a) === 'positive');
  const negative = stories.filter(a => watchSignal(a) === 'negative');
  $('watch').innerHTML = `<div class="watch-group"><h3>Progress & deals <span>${positive.length}</span></h3>${storyList(positive)}</div>
<div class="watch-group setbacks"><h3>Setbacks <span>${negative.length}</span></h3>${storyList(negative)}</div>`;
}
function render() {
  const now = new Date();
  stories = insightStories(DATA.articles, now);
  const stamp = new Date(DATA.generatedAt);
  const overdue = (now - stamp) / 36e5 > 12 ? ' · collection is overdue' : '';
  $('updated').textContent = `Last 30 days · Updated ${stamp.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}${overdue}${refreshNote}`;
  renderIndustries(); renderCompanies(); renderWatch();
}
function selectCompany(e) {
  const button = e.target.closest('button[data-company]');
  if (!button) return;
  chosen = button.dataset.company;
  $('companyFilter').value = '';
  renderCompanies();
  $('companyResults').focus({ preventScroll: true });
  $('companyResults').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
$('companyGroups').addEventListener('click', selectCompany);
$('industries').addEventListener('click', selectCompany);
$('companyFilter').addEventListener('input', renderCompanies);
render();
async function reloadInsights() {
  try {
    const response = await fetch('news.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.articles) || Number.isNaN(Date.parse(data.generatedAt))) throw new Error('Invalid archive');
    DATA = data;
  } catch {
    if (location.protocol !== 'file:') refreshNote = ' · latest data unavailable; showing the loaded version';
  }
  render();
}
reloadInsights();
