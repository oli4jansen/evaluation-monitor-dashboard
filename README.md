# Evaluation Monitor Dashboard

This dashboard is served from GitHub Pages and now authenticates with a GitHub App through a tiny token broker backend.

## Architecture

- `index.html`: static GitHub Pages frontend
- `worker/`: Cloudflare Worker that exchanges authorization codes and refresh tokens with GitHub

The frontend uses Authorization Code Flow with PKCE. The Worker holds the GitHub App client secret and exposes CORS-enabled `/exchange` and `/refresh` endpoints for the frontend.

## GitHub App setup

Create a GitHub App and configure:

- Callback URL: your deployed GitHub Pages URL, for example `https://oli4jansen.github.io/evaluation-monitor-dashboard/`
- User permissions: at minimum, repository `Contents: Read-only`
- Optional: user `Email addresses: Read-only` if you later want email access

Install the app on the account or organization that owns the repositories you want to browse.

## Cloudflare Worker setup

1. Install Wrangler and authenticate with Cloudflare.
2. From `worker/`, set the required secrets:

```bash
wrangler secret put GITHUB_APP_CLIENT_ID
wrangler secret put GITHUB_APP_CLIENT_SECRET
```

3. Update `worker/wrangler.toml`:

- Set `ALLOWED_ORIGIN` to your GitHub Pages origin
- Optionally set a different worker `name`

4. Deploy:

```bash
cd worker
wrangler deploy
```

## GitHub Pages variables

Set these repository variables in GitHub Actions:

- `GH_APP_CLIENT_ID`: the GitHub App client ID
- `AUTH_API_BASE_URL`: the deployed Worker URL, for example `https://evaluation-monitor-auth.example.workers.dev`

The Pages deploy workflow injects both values into `index.html` at build time.
