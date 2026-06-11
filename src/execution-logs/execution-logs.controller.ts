import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ExecutionLogsService } from './execution-logs.service';

@Controller('projects/:projectId/logs')
@UseGuards(JwtAuthGuard)
export class ExecutionLogsController {
  constructor(private readonly service: ExecutionLogsService) {}

  @Get()
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const lim = Math.min(Number(limit) || 50, 200);
    const sk = Number(skip) || 0;
    const [logs, total] = await Promise.all([
      this.service.findByProject(projectId, lim, sk),
      this.service.countByProject(projectId),
    ]);
    return { logs, total, limit: lim, skip: sk };
  }

  @Get('stats')
  async stats(@Param('projectId') projectId: string) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.service.getStats(since24h);
  }
}
