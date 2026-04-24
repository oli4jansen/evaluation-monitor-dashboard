const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (url.pathname === '/health') {
        return json({ ok: true }, 200, corsHeaders);
      }

      if (url.pathname === '/exchange' && request.method === 'POST') {
        const body = await request.json();
        requireFields(body, ['code', 'code_verifier', 'redirect_uri']);

        return await forwardTokenRequest({
          body: {
            client_id: env.GITHUB_APP_CLIENT_ID,
            client_secret: env.GITHUB_APP_CLIENT_SECRET,
            code: body.code,
            code_verifier: body.code_verifier,
            redirect_uri: body.redirect_uri,
          },
          corsHeaders,
          env,
        });
      }

      if (url.pathname === '/refresh' && request.method === 'POST') {
        const body = await request.json();
        requireFields(body, ['refresh_token']);

        return await forwardTokenRequest({
          body: {
            client_id: env.GITHUB_APP_CLIENT_ID,
            client_secret: env.GITHUB_APP_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: body.refresh_token,
          },
          corsHeaders,
          env,
        });
      }

      return json({ error: 'not_found' }, 404, corsHeaders);
    } catch (error) {
      return json({
        error: 'server_error',
        error_description: error.message || 'Unexpected error',
      }, 500, corsHeaders);
    }
  },
};

async function forwardTokenRequest({ body, corsHeaders, env }) {
  ensureEnv(env);

  const tokenUrl = `${env.GITHUB_BASE_URL || 'https://github.com'}/login/oauth/access_token`;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });

  const data = await response.json().catch(() => ({}));
  return json(data, response.status, corsHeaders);
}

function ensureEnv(env) {
  if (!env.GITHUB_APP_CLIENT_ID) throw new Error('Missing GITHUB_APP_CLIENT_ID');
  if (!env.GITHUB_APP_CLIENT_SECRET) throw new Error('Missing GITHUB_APP_CLIENT_SECRET');
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!body?.[field]) throw new Error(`Missing ${field}`);
  }
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = env.ALLOWED_ORIGIN || '*';
  const allowOrigin = resolveAllowedOrigin(origin, allowedOrigin);

  return {
    ...JSON_HEADERS,
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin',
  };
}

function resolveAllowedOrigin(origin, allowedOrigin) {
  if (allowedOrigin === '*') return '*';
  if (!origin) return 'null';

  const allowedOrigins = allowedOrigin
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  return allowedOrigins.includes(origin) ? origin : 'null';
}

function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      ...JSON_HEADERS,
    },
  });
}
