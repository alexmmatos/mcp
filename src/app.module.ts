import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';

import { config } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { SwaggerModule } from './swagger/swagger.module';
import { DynamicMcpModule } from './dynamic-mcp/dynamic-mcp.module';
import { ApiKeyMiddleware } from './auth/api-key.middleware';
import { ApiAdapterModule } from './api-adapter/api-adapter.module';
import { ToolsModule } from './tools/tools.module';
import { ResourcesModule } from './resources/resources.module';
import { LoggingModule } from './logging/logging.module';
import { HealthModule } from './health/health.module';
import { McpLoggingInterceptor } from './logging/mcp-logging.interceptor';
import { McpExceptionFilter } from './common/filters/mcp-exception.filter';
import { ExecutionLogsModule } from './execution-logs/execution-logs.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SettingsModule } from './settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      useFactory: () => ({ uri: config.mongoUri }),
    }),
    McpModule.forRoot({
      name: 'rest-api-mcp-wrapper',
      version: '1.0.0',
      transport: McpTransportType.STREAMABLE_HTTP,
      streamableHttp: {
        statelessMode: true,
        enableJsonResponse: true,
      },
    }),
    AuthModule,
    SwaggerModule,
    DynamicMcpModule,
    ApiAdapterModule,
    ToolsModule,
    ResourcesModule,
    LoggingModule,
    HealthModule,
    ExecutionLogsModule,
    AuditLogsModule,
    SettingsModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: McpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: McpLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ApiKeyMiddleware)
      .forRoutes({ path: 'mcp', method: RequestMethod.ALL });
  }
}
