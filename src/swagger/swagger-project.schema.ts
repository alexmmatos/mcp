import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { AuthConfig, EndpointRef, GeneratedTool, JsonSchema } from '../dynamic-mcp/types';

export type SwaggerProjectDocument = SwaggerProject & Document;

export type { AuthConfig, EndpointRef, GeneratedTool, JsonSchema };

@Schema({ timestamps: true })
export class SwaggerProject {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  baseUrl: string;

  @Prop()
  description?: string;

  @Prop()
  version?: string;

  /** Spec original (YAML/JSON parseado) — usado para re-parse se necessário */
  @Prop({ type: Object })
  rawSpec: Record<string, any>;

  /**
   * Tools geradas pelo motor mcp-openapi.
   * Cada tool contém inputSchema (para ListTools) e endpointRef/parameterMap
   * (para executar o CallTool sem re-parsear o spec).
   */
  @Prop({ type: [Object], default: [] })
  tools: GeneratedTool[];

  /** Configuração de autenticação para chamadas à API upstream */
  @Prop({ type: Object, default: { type: 'none' } })
  auth: AuthConfig;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'error'] })
  status: string;

  @Prop()
  errorMessage?: string;

  /** Chave de autenticação para chamadas ao MCP server deste projeto */
  @Prop()
  mcpApiKey?: string;

  /** Tags/categorias para filtragem na listagem */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /** Rate limiting para chamadas ao MCP server deste projeto */
  @Prop({ type: Object, default: { enabled: false, requestsPerMinute: 60 } })
  rateLimit: { enabled: boolean; requestsPerMinute: number };
}

export const SwaggerProjectSchema = SchemaFactory.createForClass(SwaggerProject);
