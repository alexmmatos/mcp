import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SwaggerProject,
  SwaggerProjectSchema,
} from '../swagger/swagger-project.schema';
import { DynamicMcpController } from './dynamic-mcp.controller';
import { DynamicMcpService } from './dynamic-mcp.service';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { ExecutionLogsModule } from '../execution-logs/execution-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SwaggerProject.name, schema: SwaggerProjectSchema },
    ]),
    ExecutionLogsModule,
  ],
  controllers: [DynamicMcpController],
  providers: [DynamicMcpService, McpApiKeyGuard, RateLimitGuard],
  exports: [DynamicMcpService],
})
export class DynamicMcpModule {}
