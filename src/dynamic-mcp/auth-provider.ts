import type { AuthConfig } from './types';
import type { PreparedRequest } from './request-builder';

// ─── OAuth2 token cache (in-memory, por instância) ───────────────────────────

interface TokenEntry { token: string; expiresAt: number }
const tokenCache = new Map<string, TokenEntry>();

async function fetchOAuth2Token(tokenUrl: string, clientId: string, clientSecret: string, scope?: string): Promise<string> {
  const cacheKey = `${tokenUrl}::${clientId}`;
  const cached = tokenCache.get(cacheKey);
  // Renova 60s antes de expirar para evitar chamadas com token quase vencido
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (scope) body.set('scope', scope);

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OAuth2 token request failed [${res.status}]: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = data.expires_in ?? 3600;
  tokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return data.access_token;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function applyAuth(request: PreparedRequest, auth: AuthConfig): Promise<PreparedRequest> {
  const headers = { ...request.headers };

  switch (auth.type) {
    case 'bearer':
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
      break;

    case 'api-key':
      if (auth.in === 'header') {
        if (auth.name && auth.value) headers[auth.name] = auth.value;
      } else {
        const url = new URL(request.url);
        if (auth.name && auth.value) url.searchParams.set(auth.name, auth.value);
        return { ...request, headers, url: url.toString() };
      }
      break;

    case 'basic': {
      if (auth.username) {
        const encoded = Buffer.from(`${auth.username}:${auth.password ?? ''}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;
    }

    case 'oauth2-client': {
      if (auth.tokenUrl && auth.clientId) {
        const token = await fetchOAuth2Token(auth.tokenUrl, auth.clientId, auth.clientSecret, auth.scope);
        headers['Authorization'] = `Bearer ${token}`;
      }
      break;
    }

    case 'custom': {
      for (const h of auth.headers ?? []) {
        if (h.name?.trim() && h.value !== undefined) headers[h.name.trim()] = h.value;
      }
      break;
    }

    case 'none':
    default:
      break;
  }

  return { ...request, headers };
}
