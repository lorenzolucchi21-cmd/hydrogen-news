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

## Files

- `config/sources.json` – the sources and their feed URLs (edit to add or remove sources).
- `src/shared.js` – relevance filter, topics, regions and scoring (the same rules as before).
- `src/template.html`, `src/style.css` – the page design.
- `scripts/build.mjs` – collects feeds with timeouts and retries, merges with the 30-day archive, builds `site/`.
- `data/archive.json` – the saved 30-day archive, updated by the workflow.
- `.github/workflows/update-news.yml` – the schedule.
- `test/` – automated tests (`npm test`).
