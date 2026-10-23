# Hydrogen News – shared website

A static page that GitHub rebuilds automatically every 4 hours. Colleagues open one link; nothing to install.

## One-time setup (about 15 minutes)

1. Sign in at https://github.com (create a free account if needed). Check with IT first if a company GitHub is required.
2. Click **New repository**. Name it `hydrogen-news`, choose **Public**, and create it.
3. On the new repository page click **uploading an existing file**. Drag in the **contents of this folder** (the `.github`, `config`, `data`, `scripts`, `src`, `test` folders plus `package.json`, `package-lock.json` and `.gitignore`). Do not upload a `node_modules` or `site` folder. Click **Commit changes**.
   - If the hidden `.github` folder does not upload by drag-and-drop, use **Add file → Create new file**, type `.github/workflows/update-news.yml` as the name, and paste in the contents of that file.
4. Go to **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
5. Go to the **Actions** tab, open **Update hydrogen news**, and click **Run workflow**. Allow Actions if GitHub asks.
6. After 2–3 minutes the run turns green. Your link is shown on the run page and under **Settings → Pages**. It looks like `https://<your-user>.github.io/hydrogen-news/`.

Share that link. From then on the page updates itself every 4 hours (GitHub may delay scheduled runs by some minutes).

## If something goes wrong

- **Run is red:** open the run in the Actions tab and read the failing step. A message such as "No source could be reached" means the collection could not connect at all; the previous page stays online.
- **Settings → Actions → General → Workflow permissions** must allow **Read and write permissions**.
- **A source shows "unreachable" in the page's *Source status* panel:** the publisher blocks or has changed its feed. Edit `config/sources.json` to correct or remove it; the next run picks it up.
- Scheduled runs pause after 60 days without repository activity on public repositories. Click **Run workflow** once to restart them.

## What it publishes

Only public headline metadata: title, short feed summary, date, image URL if the feed supplies one, and the link to the original publisher. No paywalled or full article content is collected, and no access controls are bypassed. The page is public: anyone with the link can open it.

## Tuning what appears

- **Sources** (`config/sources.json`). Three kinds of entry:
  - `urls`: public RSS/Atom feeds, read directly.
  - `google`: a publisher without a usable feed; only headlines and links are taken from Google News, restricted to that site.
  - `search`: a broad Google News query across all publishers (for example big FIDs or offtake deals). Each story keeps its real publisher name; `minScore` sets how strong the commercial signal must be.
  - `lang` (`en`, `de` or `nl`) selects the Google News edition and the language assumed for the headlines.
  - `blockedPublishers` (top of the file) lists stock-tip and similar sites to ignore.
- **Relevance rules** (`src/shared.js`). `H2` and `WATCH` decide what counts as hydrogen news (`WATCH` lists hydrogen-focused companies whose news is relevant even without a keyword, such as Reverion or Arcadia eFuels). `SIGNALS` score deals, money, capacity, policy and setbacks; `NICHE` and `EXCL` push down or remove research news, job postings, market reports and similar. Stories are ranked by this score plus recency.
- **Translation.** German and Dutch headlines are machine-translated to English with the free MyMemory service during each run, once per story, and kept in the archive. The original headline is shown beneath. If the service's daily limit is reached, the remaining headlines show in the original language and are translated in the next run. Article text and summaries are not translated.
- **Topics and regions** (`src/shared.js`). Each topic (`TOPICS`) has weighted keyword rules; a match in the headline counts double and the topic with the highest total wins (ties go to the topic listed first). Stories written in German are filed under Germany and Dutch ones under Benelux; otherwise the region with the most keyword matches wins, and stories without any are "Global". To change a rule, edit the keywords or weights in `TOPICS` and `REGIONS`.
- **Same story, several publishers.** Reports of the same story are shown once, with "Also reported by …" links. This is decided in the page by comparing headline keywords and dates (`groupSimilar`).
- **Deal-flow balance** (`POSITIVE_SIGNAL`, `NEGATIVE_SIGNAL` in `src/shared.js`). Counts positive deal stories (final investment decisions, offtake and supply agreements, contracts, funding, construction starts) against setbacks (cancellations, delays, insolvencies, withdrawals) over the last 7 days, compared with the 7 days before. At least 8 such stories are needed for a reading. It is a keyword-based indicator of direction, not a precise measurement.

## Phone home-screen icon

The page can be added to a phone's home screen: iPhone (Safari) **Share → Add to Home Screen**; Android (Chrome) menu **⋮ → Add to Home screen**. The icon, name ("H2 News") and colours come from the files in `public/` (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest`), which the build copies into the published site. `public/icon.svg` is the source drawing. After changing the icon, delete the old shortcut from the phone and add it again.

## Files

- `config/sources.json` – the sources and their feed URLs (edit to add or remove sources).
- `src/shared.js` – relevance filter, topics, regions, story grouping and the deal-flow rules.
- `src/template.html`, `src/style.css` – the page design.
- `public/` – icons and the web app manifest for the phone home screen.
- `scripts/build.mjs` – collects feeds with timeouts and retries, merges with the 30-day archive, builds `site/`.
- `scripts/translate.mjs` – translates German and Dutch headlines to English.
- `data/archive.json` – the saved 30-day archive, updated by the workflow.
- `.github/workflows/update-news.yml` – the schedule.
- `test/` – automated tests (`npm test`).
