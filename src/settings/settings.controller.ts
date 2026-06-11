import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  @Get()
  get() {
    return this.settings.getSafe();
  }

  @Patch()
  async update(@Request() req: any, @Body() dto: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Acesso restrito a administradores.');
    const updated = await this.settings.update(dto);
    this.auditLogs.log({
      userId: req.user.userId,
      username: req.user.username,
      action: 'update',
      entity: 'settings',
      entityName: 'Configurações do sistema',
      ip: req.ip,
    });
    return updated;
  }
}
