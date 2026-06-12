import { buildRequest } from './request-builder';
import type { EndpointRef } from './types';

const base: EndpointRef = {
  baseUrl: 'https://api.example.com',
  path: '/pets',
  method: 'GET',
  parameterMap: [],
  contentType: 'application/json',
};

describe('buildRequest', () => {
  it('builds a minimal GET with no params', () => {
    const result = buildRequest({}, base);
    expect(result.url).toBe('https://api.example.com/pets');
    expect(result.method).toBe('GET');
    expect(result.body).toBeUndefined();
  });

  it('substitutes path parameters', () => {
    const ep: EndpointRef = {
      ...base,
      path: '/pets/{petId}',
      parameterMap: [{ toolParamName: 'petId', originalName: 'petId', source: 'path', required: true }],
    };
    const result = buildRequest({ petId: 42 }, ep);
    expect(result.url).toBe('https://api.example.com/pets/42');
  });

  it('appends query parameters to the URL', () => {
    const ep: EndpointRef = {
      ...base,
      parameterMap: [{ toolParamName: 'status', originalName: 'status', source: 'query', required: false }],
    };
    const result = buildRequest({ status: 'available' }, ep);
    const url = new URL(result.url);
    expect(url.searchParams.get('status')).toBe('available');
  });

  it('adds header parameters to headers', () => {
    const ep: EndpointRef = {
      ...base,
      parameterMap: [{ toolParamName: 'apiKey', originalName: 'X-Api-Key', source: 'header', required: false }],
    };
    const result = buildRequest({ apiKey: 'secret' }, ep);
    expect(result.headers['X-Api-Key']).toBe('secret');
  });

  it('builds body and sets Content-Type for body parameters', () => {
    const ep: EndpointRef = {
      ...base,
      method: 'POST',
      parameterMap: [{ toolParamName: 'name', originalName: 'name', source: 'body', required: true }],
    };
    const result = buildRequest({ name: 'Fido' }, ep);
    expect(result.body).toEqual({ name: 'Fido' });
    expect(result.headers['Content-Type']).toBe('application/json');
  });

  it('spreads object body when originalName is "body"', () => {
    const ep: EndpointRef = {
      ...base,
      method: 'POST',
      parameterMap: [{ toolParamName: 'payload', originalName: 'body', source: 'body', required: true }],
    };
    const result = buildRequest({ payload: { id: 1, name: 'Rex' } }, ep);
    expect(result.body).toEqual({ id: 1, name: 'Rex' });
  });

  it('merges extra headers', () => {
    const result = buildRequest({}, base, { 'X-Custom': 'val' });
    expect(result.headers['X-Custom']).toBe('val');
  });

  it('skips undefined args', () => {
    const ep: EndpointRef = {
      ...base,
      parameterMap: [{ toolParamName: 'optional', originalName: 'optional', source: 'query', required: false }],
    };
    const result = buildRequest({}, ep);
    const url = new URL(result.url);
    expect(url.searchParams.has('optional')).toBe(false);
  });

  it('preserves base URL pathname (does not drop /v2 prefix)', () => {
    const result = buildRequest({}, { ...base, baseUrl: 'https://api.example.com/v2' });
    expect(result.url).toBe('https://api.example.com/v2/pets');
  });

  it('does not add Content-Type when there is no body', () => {
    const result = buildRequest({}, base);
    expect(result.headers['Content-Type']).toBeUndefined();
  });
});
