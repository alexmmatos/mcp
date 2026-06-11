import { Injectable } from '@nestjs/common';
import * as NodeCache from 'node-cache';

const TTL_30_DAYS = 30 * 24 * 60 * 60;

export interface AuditEntry {
  id: string;
  userId?: string;
  username: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  ip?: string;
  createdAt: Date;
}

export interface LogAuditDto {
  userId?: string;
  username: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  ip?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly cache = new NodeCache({ stdTTL: TTL_30_DAYS, useClones: false });

  /** Fire-and-forget */
  log(dto: LogAuditDto): void {
    const id = crypto.randomUUID();
    this.cache.set(id, { id, ...dto, createdAt: new Date() } as AuditEntry);
  }

  async findAll(limit = 100, skip = 0): Promise<AuditEntry[]> {
    const map = this.cache.mget<AuditEntry>(this.cache.keys());
    const all = Object.values(map)
      .filter((v): v is AuditEntry => !!v)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all.slice(skip, skip + limit);
  }

  async count(): Promise<number> {
    return this.cache.keys().length;
  }
}
