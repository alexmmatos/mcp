import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SwaggerProject, SwaggerProjectDocument } from '../swagger/swagger-project.schema';

/**
 * Sliding-window in-memory rate limiter por projeto.
 * Limita o número de chamadas ao MCP server por minuto.
 * Em produção com múltiplas instâncias, substituir por Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  /** projectId → timestamps das requisições na janela atual */
  private readonly windows = new Map<string, number[]>();

  constructor(
    @InjectModel(SwaggerProject.name)
    private readonly projectModel: Model<SwaggerProjectDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const projectId: string = req.params['projectId'];

    const project = await this.projectModel
      .findById(projectId)
      .select('rateLimit')
      .exec();

    if (!project?.rateLimit?.enabled) return true;

    const { requestsPerMinute } = project.rateLimit;
    const windowMs = 60_000;
    const now = Date.now();

    // Desliza a janela: remove timestamps mais antigos que 1 minuto
    const prev = this.windows.get(projectId) ?? [];
    const recent = prev.filter((t) => now - t < windowMs);

    const remaining = Math.max(0, requestsPerMinute - recent.length);
    const resetAt = recent.length > 0 ? recent[0] + windowMs : now + windowMs;

    // Injeta headers informativos (padrão de mercado)
    res.setHeader('X-RateLimit-Limit', requestsPerMinute);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining - 1));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    if (recent.length >= requestsPerMinute) {
      const retryAfterSec = Math.ceil((resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit excedido: máximo de ${requestsPerMinute} req/min. Tente novamente em ${retryAfterSec}s.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.windows.set(projectId, recent);
    return true;
  }
}
