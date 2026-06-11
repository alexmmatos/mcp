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
 *
 * Ordem de verificação:
 *  1. Se o projeto tem `mcpApiKeys` (novo sistema), valida contra qualquer uma delas.
 *  2. Se o projeto tem `mcpApiKey` (legacy, campo único), valida contra ele.
 *  3. Se não tem nenhuma key configurada, acesso livre.
 *
 * O cliente deve fornecer a key no header:  auth: <key>
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
      .select('mcpApiKey mcpApiKeys')
      .exec();

    if (!project) return true;

    const hasNewKeys = project.mcpApiKeys && project.mcpApiKeys.length > 0;
    const hasLegacyKey = !!project.mcpApiKey;

    if (!hasNewKeys && !hasLegacyKey) return true;

    const provided =
      typeof req.headers['auth'] === 'string' ? req.headers['auth'].trim() : null;

    if (!provided) {
      throw new UnauthorizedException(
        'API key ausente. Forneça o header: auth: <key>',
      );
    }

    if (hasNewKeys) {
      const match = project.mcpApiKeys.some((k) => k.key === provided);
      if (!match) throw new UnauthorizedException('API key inválida.');
      return true;
    }

    if (provided !== project.mcpApiKey) {
      throw new UnauthorizedException('API key inválida.');
    }

    return true;
  }
}
