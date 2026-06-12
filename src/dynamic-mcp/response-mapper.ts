import type { HttpResponse } from './http-client';

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

const MAX_LEN = 5000;

export function mapResponse(response: HttpResponse): McpToolResult {
  if (response.status >= 400) {
    return {
      content: [{ type: 'text', text: `HTTP ${response.status} ${response.statusText}\n\n${truncate(response.body, 2000)}` }],
      isError: true,
    };
  }

  if (response.contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(response.body);
      const text = smartTruncate(parsed);
      return { content: [{ type: 'text', text }] };
    } catch {
      return { content: [{ type: 'text', text: truncate(response.body, MAX_LEN) }] };
    }
  }

  if (response.contentType.includes('text/') || response.contentType.includes('xml')) {
    return { content: [{ type: 'text', text: truncate(response.body, MAX_LEN) }] };
  }

  return {
    content: [{ type: 'text', text: `[Binary: ${response.contentType}, ${response.body.length} bytes, HTTP ${response.status}]` }],
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n... [truncado, ${text.length - max} caracteres omitidos]`;
}

function smartTruncate(data: unknown, maxLen = MAX_LEN, maxDepth = 5, arraySlice = 20): string {
  const shrunk = shrinkData(data, maxDepth, arraySlice);
  const text = JSON.stringify(shrunk, null, 2);
  return truncate(text, maxLen);
}

function shrinkData(data: unknown, depth: number, arraySlice: number): unknown {
  if (depth === 0) return typeof data === 'object' && data !== null ? '[...]' : data;
  if (Array.isArray(data)) {
    const sliced = data.slice(0, arraySlice);
    const result = sliced.map((item) => shrinkData(item, depth - 1, arraySlice));
    if (data.length > arraySlice) result.push(`... ${data.length - arraySlice} mais itens`);
    return result;
  }
  if (data !== null && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return Object.fromEntries(entries.map(([k, v]) => [k, shrinkData(v, depth - 1, arraySlice)]));
  }
  return data;
}
