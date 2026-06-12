import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { SpaFilter } from './common/filters/spa.filter';
import { JsonLogger } from './logging/json-logger';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const logger = new JsonLogger();

  const app = await NestFactory.create(AppModule, { logger });

  app.enableCors({ origin: true, credentials: true });

  // Prefixo global /api — exclui endpoints MCP e health (acessados diretamente)
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health',      method: RequestMethod.ALL },
      { path: 'mcp/*',       method: RequestMethod.ALL },
      { path: 'mcp-docs',    method: RequestMethod.ALL },
      { path: 'mcp-docs/*',  method: RequestMethod.ALL },
    ],
  });

  app.enableShutdownHooks();

  // Serve arquivos estáticos do build do Vite (usado quando não há nginx na frente)
  const publicPath = join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // SPA fallback: rotas do React Router (ex: /dashboard) retornam index.html
  app.useGlobalFilters(new SpaFilter());

  const port = parseInt(process.env.PORT, 10) || 3000;
  await app.listen(port);

  logger.log(`MCP server started on :${port}`, 'Bootstrap');
}

bootstrap();
