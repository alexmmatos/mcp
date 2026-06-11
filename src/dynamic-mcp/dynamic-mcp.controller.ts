import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { DynamicMcpService } from './dynamic-mcp.service';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * Endpoint MCP por projeto — stateless Streamable HTTP.
 * URL: /mcp/project/:projectId
 *
 * Suporte a clientes MCP (Claude Desktop, Cursor, etc.) que usam:
 *   POST   /mcp/project/:projectId   → ListTools / CallTool
 *   GET    /mcp/project/:projectId   → SSE (ping de conectividade)
 *   DELETE /mcp/project/:projectId   → Encerra sessão (no-op em stateless)
 */
@Controller('mcp/project')
export class DynamicMcpController {
  constructor(private readonly dynamicMcpService: DynamicMcpService) {}

  /**
   * Endpoint REST simples para testar uma tool direto no frontend.
   * Chama baseUrl + endpoint externo sem passar pelo protocolo MCP.
   * POST /mcp/project/:projectId/execute/:toolName
   * Body: { arguments: { param1: value1, ... } }
   */
  @Post(':projectId/execute/:toolName')
  @HttpCode(200)
  async executeToolDirect(
    @Param('projectId') projectId: string,
    @Param('toolName') toolName: string,
    @Body('arguments') args: Record<string, unknown>,
  ) {
    return this.dynamicMcpService.executeTool(projectId, toolName, args ?? {});
  }

  @UseGuards(McpApiKeyGuard, RateLimitGuard)
  @Post(':projectId')
  @HttpCode(200)
  async handlePost(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const server = await this.dynamicMcpService.createMcpServer(projectId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true, // retorna JSON puro em vez de SSE para clientes que aceitam JSON
    });

    res.on('close', () => server.close().catch(() => undefined));

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  @UseGuards(McpApiKeyGuard, RateLimitGuard)
  @Get(':projectId')
  async handleGet(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const server = await this.dynamicMcpService.createMcpServer(projectId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => server.close().catch(() => undefined));

    await server.connect(transport);
    await transport.handleRequest(req, res);
  }

  @UseGuards(McpApiKeyGuard, RateLimitGuard)
  @Delete(':projectId')
  @HttpCode(200)
  async handleDelete(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const server = await this.dynamicMcpService.createMcpServer(projectId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => server.close().catch(() => undefined));

    await server.connect(transport);
    await transport.handleRequest(req, res);
  }
}
