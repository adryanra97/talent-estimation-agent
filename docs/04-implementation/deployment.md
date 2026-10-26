# Deployment

## GitHub

1. Create a public, empty repository.
2. Push this project to `main`. CI runs lint, type check, tests, the demo
   evaluation pipeline, and the web build.

## Vercel

1. Sign in to Vercel with GitHub and choose **Add New Project**.
2. Import the repository. The framework is Next.js (set in `vercel.json`).
3. Deploy. No environment variables are required.
4. Optional: enable **Deployment Protection** in project settings to restrict access.

Every push to `main` deploys again.

### How the pieces are served

- Next.js builds the pages.
- `api/index.py` runs as a Python function. Next.js rewrites `/api/py/*` to it
  in production and to `http://127.0.0.1:8000` in development.
- Python dependencies are listed in `requirements.txt`, exported from
  `uv.lock` (`uv export --package talent-estimation-agent --no-dev --no-hashes --no-emit-project`).
  The pre-commit hook keeps it in sync.
- `vercel.json` sets the function's maximum duration to 300 seconds, the
  region to Singapore (`sin1`), and excludes non-runtime folders from the
  function bundle.

### Check after the first deploy

- `https://<project>.vercel.app/api/py/health` returns `{"status": "ok"}`.
- The demo run completes from the home page.
- With a key, **Pengaturan > Tes koneksi** succeeds.

## Local development

```bash
uv sync --all-packages --extra dev
npm install
npm run dev
```
