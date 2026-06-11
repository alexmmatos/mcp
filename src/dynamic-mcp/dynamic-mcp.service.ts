import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  SwaggerProject,
  SwaggerProjectDocument,
} from '../swagger/swagger-project.schema';
import type { GeneratedTool } from './types';
import { buildRequest } from './request-builder';
import { executeRequest } from './http-client';
import { mapResponse, McpToolResult } from './response-mapper';
import { applyAuth } from './auth-provider';
import { ExecutionLogsService } from '../execution-logs/execution-logs.service';

@Injectable()
export class DynamicMcpService {
  private readonly logger = new Logger(DynamicMcpService.name);

  constructor(
    @InjectModel(SwaggerProject.name)
    private readonly projectModel: Model<SwaggerProjectDocument>,
    private readonly executionLogs: ExecutionLogsService,
  ) {}

  async createMcpServer(projectId: string): Promise<Server> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException(`Projeto ${projectId} não encontrado.`);

    const tools: GeneratedTool[] = (project.tools ?? []).filter((t) => t.enabled !== false);
    const toolMap = new Map(tools.map((t) => [t.name, t]));
    const auth = project.auth ?? { type: 'none' };

    this.logger.log(`MCP server para "${project.name}": ${tools.length} tools (${project.tools?.length ?? 0} total, ${(project.tools ?? []).filter(t => t.enabled === false).length} disabled)`);

    const server = new Server(
      { name: `arthur-mcp-adapter:${project.name}`, version: project.version ?? '1.0.0' },
      { capabilities: { tools: {} } },
    );

    // ListTools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: 'object' as const,
          properties: t.inputSchema.properties ?? {},
          ...(t.inputSchema.required ? { required: t.inputSchema.required } : {}),
        },
      })),
    }));

    // CallTool
    server.setRequestHandler(CallToolRequestSchema, async (req): Promise<any> => {
      const args = (req.params.arguments ?? {}) as Record<string, unknown>;
      const toolName = req.params.name;
      const tool = toolMap.get(toolName);
      const t0 = Date.now();

      this.logger.log(`CallTool → "${toolName}" | args: ${JSON.stringify(args)}`);

      if (!tool) {
        this.logger.warn(`Tool não encontrada: "${toolName}" | disponíveis: [${[...toolMap.keys()].join(', ')}]`);
        this.executionLogs.log({ projectId, projectName: project.name, toolName, source: 'mcp', isError: true, statusCode: 404, errorMessage: 'Tool não encontrada', responseTimeMs: Date.now() - t0 });
        return {
          content: [{ type: 'text' as const, text: `Tool desconhecida: ${toolName}` }],
          isError: true,
        };
      }

      if (!tool.endpointRef) {
        this.logger.error(`Tool "${toolName}" não possui endpointRef — dados podem estar desatualizados. Re-faça o upload.`);
        this.executionLogs.log({ projectId, projectName: project.name, toolName, source: 'mcp', isError: true, statusCode: 500, errorMessage: 'endpointRef ausente', responseTimeMs: Date.now() - t0 });
        return {
          content: [{ type: 'text' as const, text: `Configuração interna inválida para "${toolName}". Re-faça o upload do spec.` }],
          isError: true,
        };
      }

      try {
        let httpReq = buildRequest(args, tool.endpointRef);
        httpReq = await applyAuth(httpReq, auth);

        this.logger.log(`→ HTTP ${httpReq.method} ${httpReq.url}`);

        const httpRes = await executeRequest(httpReq);

        this.logger.log(`← HTTP ${httpRes.status} ${httpRes.statusText}`);

        const result = mapResponse(httpRes);
        this.executionLogs.log({ projectId, projectName: project.name, toolName, source: 'mcp', statusCode: httpRes.status, responseTimeMs: Date.now() - t0, isError: result.isError ?? false });
        return result;
      } catch (err: any) {
        this.logger.error(`Erro ao executar "${toolName}": ${err?.message}`);
        this.executionLogs.log({ projectId, projectName: project.name, toolName, source: 'mcp', isError: true, statusCode: 500, errorMessage: err?.message, responseTimeMs: Date.now() - t0 });
        return {
          content: [{ type: 'text' as const, text: `Erro: ${err?.message ?? 'Erro desconhecido'}` }],
          isError: true,
        };
      }
    });

    return server;
  }

  /**
   * Executa uma tool diretamente — sem protocolo MCP.
   * Usado pelo endpoint REST de teste no frontend.
   */
  async executeTool(
    projectId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpToolResult> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException(`Projeto ${projectId} não encontrado.`);

    const tools: GeneratedTool[] = project.tools ?? [];
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) throw new NotFoundException(`Ferramenta "${toolName}" não encontrada.`);

    const auth = project.auth ?? { type: 'none' };
    const t0 = Date.now();

    try {
      let httpReq = buildRequest(args, tool.endpointRef);
      httpReq = await applyAuth(httpReq, auth);
      const httpRes = await executeRequest(httpReq);
      const result = mapResponse(httpRes);
      this.executionLogs.log({ projectId, projectName: project.name, toolName, source: 'direct', statusCode: httpRes.status, responseTimeMs: Date.now() - t0, isError: result.isError ?? false });
      return result;
    } catch (err: any) {
      this.logger.error(`Erro ao executar ${toolName}: ${err?.message}`);
      this.executionLogs.log({ projectId, projectName: project.name, toolName, source: 'direct', isError: true, statusCode: 500, errorMessage: err?.message, responseTimeMs: Date.now() - t0 });
      return {
        content: [{ type: 'text', text: `Erro: ${err?.message ?? 'Erro desconhecido'}` }],
        isError: true,
      };
    }
  }
}
