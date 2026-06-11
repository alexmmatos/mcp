import { Module } from '@nestjs/common';
import { ExecutionLogsService } from './execution-logs.service';
import { ExecutionLogsController } from './execution-logs.controller';

@Module({
  controllers: [ExecutionLogsController],
  providers: [ExecutionLogsService],
  exports: [ExecutionLogsService],
})
export class ExecutionLogsModule {}
