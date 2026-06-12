import { applyAuth } from './auth-provider';
import type { PreparedRequest } from './request-builder';

const req: PreparedRequest = {
  url: 'https://api.example.com/resource',
  method: 'GET',
  headers: {},
};

describe('applyAuth', () => {
  it('adds Bearer Authorization header', async () => {
    const result = await applyAuth(req, { type: 'bearer', token: 'my-token' });
    expect(result.headers['Authorization']).toBe('Bearer my-token');
  });

  it('does not add Authorization when bearer token is empty string', async () => {
    const result = await applyAuth(req, { type: 'bearer', token: '' });
    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('adds api-key to header when in=header', async () => {
    const result = await applyAuth(req, { type: 'api-key', in: 'header', name: 'X-Api-Key', value: 'secret' });
    expect(result.headers['X-Api-Key']).toBe('secret');
  });

  it('appends api-key to query string when in=query', async () => {
    const result = await applyAuth(req, { type: 'api-key', in: 'query', name: 'apikey', value: 'secret' });
    expect(new URL(result.url).searchParams.get('apikey')).toBe('secret');
  });

  it('adds Basic Authorization header', async () => {
    const result = await applyAuth(req, { type: 'basic', username: 'user', password: 'pass' });
    const encoded = Buffer.from('user:pass').toString('base64');
    expect(result.headers['Authorization']).toBe(`Basic ${encoded}`);
  });

  it('handles basic auth with empty password (uses empty string)', async () => {
    const result = await applyAuth(req, { type: 'basic', username: 'user', password: '' });
    const encoded = Buffer.from('user:').toString('base64');
    expect(result.headers['Authorization']).toBe(`Basic ${encoded}`);
  });

  it('adds custom headers', async () => {
    const result = await applyAuth(req, { type: 'custom', headers: [{ name: 'X-Tenant', value: 'acme' }] });
    expect(result.headers['X-Tenant']).toBe('acme');
  });

  it('skips custom headers with blank name', async () => {
    const result = await applyAuth(req, { type: 'custom', headers: [{ name: '  ', value: 'acme' }] });
    expect(result.headers['  ']).toBeUndefined();
  });

  it('does nothing for type "none"', async () => {
    const result = await applyAuth(req, { type: 'none' });
    expect(result.headers).toEqual({});
    expect(result.url).toBe(req.url);
  });

  it('does not mutate the original request headers', async () => {
    const original = { ...req, headers: { existing: 'value' } };
    await applyAuth(original, { type: 'bearer', token: 'tok' });
    expect(original.headers['Authorization']).toBeUndefined();
  });

  it('returns a new object (immutable)', async () => {
    const result = await applyAuth(req, { type: 'bearer', token: 'tok' });
    expect(result).not.toBe(req);
  });
});
