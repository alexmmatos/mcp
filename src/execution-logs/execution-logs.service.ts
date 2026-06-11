import { Injectable } from '@nestjs/common';
import * as NodeCache from 'node-cache';

const TTL_7_DAYS = 7 * 24 * 60 * 60;

export interface LogEntry {
  id: string;
  projectId: string;
  projectName: string;
  toolName: string;
  source: 'mcp' | 'direct';
  statusCode: number;
  responseTimeMs: number;
  isError: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface LogExecutionDto {
  projectId: string;
  projectName: string;
  toolName: string;
  source?: 'mcp' | 'direct';
  statusCode?: number;
  responseTimeMs?: number;
  isError?: boolean;
  errorMessage?: string;
}

@Injectable()
export class ExecutionLogsService {
  private readonly cache = new NodeCache({ stdTTL: TTL_7_DAYS, useClones: false });

  log(dto: LogExecutionDto): void {
    const id = crypto.randomUUID();
    const entry: LogEntry = {
      id,
      projectId: dto.projectId,
      projectName: dto.projectName,
      toolName: dto.toolName,
      source: dto.source ?? 'mcp',
      statusCode: dto.statusCode ?? 200,
      responseTimeMs: dto.responseTimeMs ?? 0,
      isError: dto.isError ?? false,
      errorMessage: dto.errorMessage,
      createdAt: new Date(),
    };
    this.cache.set(`${dto.projectId}:${id}`, entry);
  }

  private allEntries(): LogEntry[] {
    const map = this.cache.mget<LogEntry>(this.cache.keys());
    return Object.values(map).filter((v): v is LogEntry => !!v);
  }

  private projectEntries(projectId: string): LogEntry[] {
    const prefix = `${projectId}:`;
    const keys = this.cache.keys().filter((k) => k.startsWith(prefix));
    const map = this.cache.mget<LogEntry>(keys);
    return Object.values(map)
      .filter((v): v is LogEntry => !!v)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByProject(projectId: string, limit = 100, skip = 0): Promise<LogEntry[]> {
    return this.projectEntries(projectId).slice(skip, skip + limit);
  }

  async countByProject(projectId: string): Promise<number> {
    return this.projectEntries(projectId).length;
  }

  async getStats(since?: Date): Promise<{
    total: number;
    errors: number;
    avgResponseMs: number;
    byTool: { toolName: string; count: number; errors: number }[];
  }> {
    const logs = since
      ? this.allEntries().filter((e) => e.createdAt >= since)
      : this.allEntries();

    const total = logs.length;
    const errors = logs.filter((e) => e.isError).length;
    const avgResponseMs =
      total > 0 ? Math.round(logs.reduce((s, e) => s + e.responseTimeMs, 0) / total) : 0;

    const toolMap = new Map<string, { count: number; errors: number }>();
    for (const e of logs) {
      const t = toolMap.get(e.toolName) ?? { count: 0, errors: 0 };
      t.count++;
      if (e.isError) t.errors++;
      toolMap.set(e.toolName, t);
    }

    const byTool = [...toolMap.entries()]
      .map(([toolName, s]) => ({ toolName, ...s }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { total, errors, avgResponseMs, byTool };
  }

  getInRange(from: Date, to: Date): LogEntry[] {
    return this.allEntries().filter((e) => e.createdAt >= from && e.createdAt <= to);
  }

  deleteByProject(projectId: string): void {
    const prefix = `${projectId}:`;
    const keys = this.cache.keys().filter((k) => k.startsWith(prefix));
    if (keys.length) this.cache.del(keys);
  }
}
