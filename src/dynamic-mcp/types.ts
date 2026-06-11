/** JSON Schema subset aceito por tools MCP */
export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  format?: string;
  [key: string]: unknown;
};

export interface NormalizedSpec {
  info: { title: string; version: string; description?: string };
  servers: Array<{ url: string }>;
  endpoints: NormalizedEndpoint[];
  securitySchemes: Record<string, SecurityScheme>;
}

export interface NormalizedEndpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: NormalizedParameter[];
  requestBody?: NormalizedRequestBody;
  responses: Record<string, NormalizedResponse>;
  tags?: string[];
  deprecated?: boolean;
}

export interface NormalizedParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

export interface NormalizedRequestBody {
  required: boolean;
  description?: string;
  contentType: string;
  schema: JsonSchema;
}

export interface NormalizedResponse {
  description?: string;
  contentType?: string;
  schema?: JsonSchema;
}

export type SecurityScheme =
  | { type: 'apiKey'; name: string; in: 'header' | 'query' | 'cookie' }
  | { type: 'http'; scheme: string; bearerFormat?: string }
  | { type: 'oauth2'; flows: Record<string, { tokenUrl?: string; scopes: Record<string, string> }> };

/** Mapeamento de arg MCP → campo da request HTTP */
export interface ParameterMapping {
  toolParamName: string;
  source: 'path' | 'query' | 'header' | 'body';
  originalName: string;
  required: boolean;
}

/** Tool pronta para ser servida pelo MCP server e armazenada no MongoDB */
export interface GeneratedTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  endpointRef: EndpointRef;
  /** false = tool desabilitada; ausente/true = habilitada */
  enabled?: boolean;
}

export interface EndpointRef {
  method: string;
  path: string;
  baseUrl: string;
  contentType: string;
  parameterMap: ParameterMapping[];
}

/** Configuração de autenticação por projeto */
export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; name: string; value: string; in: 'header' | 'query' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2-client'; tokenUrl: string; clientId: string; clientSecret: string; scope?: string }
  | { type: 'custom'; headers: { name: string; value: string }[] };
