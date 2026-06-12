import { mapResponse } from './response-mapper';
import type { HttpResponse } from './http-client';

const res = (overrides: Partial<HttpResponse> = {}): HttpResponse => ({
  status: 200,
  statusText: 'OK',
  headers: {},
  body: '',
  contentType: 'text/plain',
  ...overrides,
});

describe('mapResponse', () => {
  it('returns isError:true for 4xx response', () => {
    const result = mapResponse(res({ status: 404, statusText: 'Not Found', body: 'not found' }));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('HTTP 404');
  });

  it('returns isError:true for 5xx response', () => {
    const result = mapResponse(res({ status: 500, statusText: 'Internal Server Error', body: 'error' }));
    expect(result.isError).toBe(true);
  });

  it('parses JSON and returns formatted text for application/json', () => {
    const body = JSON.stringify({ id: 1, name: 'Fido' });
    const result = mapResponse(res({ body, contentType: 'application/json' }));
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('"name"');
    expect(result.content[0].text).toContain('"Fido"');
  });

  it('falls back to raw text for unparseable JSON', () => {
    const result = mapResponse(res({ body: '{bad json}', contentType: 'application/json' }));
    expect(result.content[0].text).toContain('{bad json}');
  });

  it('returns body text for text/html', () => {
    const result = mapResponse(res({ body: '<h1>Hello</h1>', contentType: 'text/html' }));
    expect(result.content[0].text).toBe('<h1>Hello</h1>');
  });

  it('returns body text for text/xml', () => {
    const result = mapResponse(res({ body: '<root/>', contentType: 'text/xml' }));
    expect(result.content[0].text).toBe('<root/>');
  });

  it('returns binary placeholder for binary content types', () => {
    const result = mapResponse(res({ body: 'bytes', contentType: 'image/png' }));
    expect(result.content[0].text).toContain('Binary');
    expect(result.content[0].text).toContain('image/png');
  });

  it('truncates body text over 5000 chars', () => {
    const longBody = 'a'.repeat(10_000);
    const result = mapResponse(res({ body: longBody, contentType: 'text/plain' }));
    expect(result.content[0].text.length).toBeLessThan(10_000);
    expect(result.content[0].text).toContain('truncado');
  });

  it('slices large JSON arrays and adds "mais itens" note', () => {
    const arr = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const result = mapResponse(res({ body: JSON.stringify(arr), contentType: 'application/json' }));
    expect(result.content[0].text).toContain('mais itens');
  });

  it('all content items have type "text"', () => {
    const result = mapResponse(res({ body: 'hello', contentType: 'text/plain' }));
    expect(result.content.every((c) => c.type === 'text')).toBe(true);
  });
});
