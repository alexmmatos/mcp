import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request } from 'express';
import {
  SwaggerProject,
  SwaggerProjectDocument,
} from '../swagger/swagger-project.schema';

/**
 * Guard aplicado nos endpoints do protocolo MCP (/mcp/project/:projectId).
 * Se o projeto tiver mcpApiKey configurada, o cliente deve fornecer:
 *   Authorization: Bearer <key>
 *   — ou —
 *   X-Api-Key: <key>
 *
 * Se o projeto não tiver key configurada, a requisição é liberada.
 */
@Injectable()
export class McpApiKeyGuard implements CanActivate {
  constructor(
    @InjectModel(SwaggerProject.name)
    private readonly projectModel: Model<SwaggerProjectDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const projectId = req.params['projectId'];

    const project = await this.projectModel
      .findById(projectId)
      .select('mcpApiKey')
      .exec();

    // Se projeto não existe, deixa passar (o service vai lançar 404)
    if (!project) return true;

    // Sem key configurada → acesso livre
    if (!project.mcpApiKey) return true;

    const provided =
      typeof req.headers['auth'] === 'string' ? req.headers['auth'].trim() : null;

    if (!provided || provided !== project.mcpApiKey) {
      throw new UnauthorizedException(
        'API key inválida ou ausente. Forneça o header: auth: <key>',
      );
    }

    return true;
  }
}
