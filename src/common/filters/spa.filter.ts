import { ExceptionFilter, Catch, NotFoundException, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

const INDEX_HTML = join(__dirname, '..', '..', '..', 'public', 'index.html');

const API_PREFIXES = ['/api', '/mcp', '/health', '/mcp-docs'];

@Catch(NotFoundException)
export class SpaFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const req  = ctx.getRequest<Request>();
    const res  = ctx.getResponse<Response>();

    const isApiPath = API_PREFIXES.some((p) => req.path.startsWith(p));

    if (!isApiPath && existsSync(INDEX_HTML)) {
      res.sendFile(INDEX_HTML);
    } else {
      res.status(404).json(exception.getResponse());
    }
  }
}
