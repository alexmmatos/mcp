import { describe, it, expect, beforeEach } from 'vitest';

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exports a default axios instance with baseURL /api', async () => {
    const { default: api } = await import('./api');
    expect(api.defaults.baseURL).toBe('/api');
  });

  it('has get and post methods', async () => {
    const { default: api } = await import('./api');
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
  });
});
