import { ExecutionLogsService } from './execution-logs.service';

const dto = {
  projectId: 'proj1',
  projectName: 'Test Project',
  toolName: 'getTodo',
  source: 'mcp' as const,
  statusCode: 200,
  responseTimeMs: 120,
  isError: false,
};

describe('ExecutionLogsService', () => {
  let service: ExecutionLogsService;

  beforeEach(() => {
    service = new ExecutionLogsService();
  });

  it('logs an entry retrievable by project', async () => {
    service.log(dto);
    const entries = await service.findByProject('proj1');
    expect(entries).toHaveLength(1);
    expect(entries[0].toolName).toBe('getTodo');
    expect(entries[0].projectId).toBe('proj1');
  });

  it('assigns defaults when optional fields are absent', async () => {
    service.log({ projectId: 'p', projectName: 'P', toolName: 'tool' });
    const [entry] = await service.findByProject('p');
    expect(entry.source).toBe('mcp');
    expect(entry.statusCode).toBe(200);
    expect(entry.responseTimeMs).toBe(0);
    expect(entry.isError).toBe(false);
  });

  it('countByProject counts correctly', async () => {
    service.log(dto);
    service.log(dto);
    expect(await service.countByProject('proj1')).toBe(2);
  });

  it('countByProject returns 0 for unknown project', async () => {
    expect(await service.countByProject('unknown')).toBe(0);
  });

  it('getStats totals all entries', async () => {
    service.log(dto);
    service.log({ ...dto, isError: true });
    const stats = await service.getStats();
    expect(stats.total).toBe(2);
    expect(stats.errors).toBe(1);
  });

  it('getStats computes average response time', async () => {
    service.log({ ...dto, responseTimeMs: 100 });
    service.log({ ...dto, responseTimeMs: 200 });
    const { avgResponseMs } = await service.getStats();
    expect(avgResponseMs).toBe(150);
  });

  it('getStats filters by since date', async () => {
    service.log(dto);
    const future = new Date(Date.now() + 60_000);
    const stats = await service.getStats(future);
    expect(stats.total).toBe(0);
  });

  it('getStats groups by tool name', async () => {
    service.log({ ...dto, toolName: 'toolA' });
    service.log({ ...dto, toolName: 'toolA' });
    service.log({ ...dto, toolName: 'toolB' });
    const { byTool } = await service.getStats();
    const toolA = byTool.find((t) => t.toolName === 'toolA');
    expect(toolA?.count).toBe(2);
  });

  it('findByProject respects limit', async () => {
    for (let i = 0; i < 5; i++) service.log(dto);
    const page = await service.findByProject('proj1', 2);
    expect(page).toHaveLength(2);
  });

  it('findByProject respects skip', async () => {
    for (let i = 0; i < 5; i++) service.log(dto);
    const all = await service.findByProject('proj1', 100, 0);
    const skipped = await service.findByProject('proj1', 100, 3);
    expect(skipped).toHaveLength(all.length - 3);
  });

  it('deleteByProject removes only that project entries', async () => {
    service.log(dto);
    service.log({ ...dto, projectId: 'other', projectName: 'Other' });
    service.deleteByProject('proj1');
    expect(await service.countByProject('proj1')).toBe(0);
    expect(await service.countByProject('other')).toBe(1);
  });

  it('getInRange returns entries within the time window', () => {
    service.log(dto);
    const past = new Date(Date.now() - 10_000);
    const future = new Date(Date.now() + 10_000);
    const results = service.getInRange(past, future);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('getInRange excludes entries outside the window', () => {
    service.log(dto);
    const longAgo = new Date(Date.now() - 100_000);
    const stillPast = new Date(Date.now() - 50_000);
    expect(service.getInRange(longAgo, stillPast)).toHaveLength(0);
  });

  it('getHealthSummary returns errorRatePct=-1 when no recent calls', () => {
    const summary = service.getHealthSummary(['empty-proj']);
    expect(summary.get('empty-proj')?.errorRatePct).toBe(-1);
    expect(summary.get('empty-proj')?.totalCalls).toBe(0);
  });

  it('getHealthSummary computes error rate correctly', () => {
    service.log(dto);
    service.log({ ...dto, isError: true });
    const summary = service.getHealthSummary(['proj1']);
    expect(summary.get('proj1')?.errorRatePct).toBe(50);
    expect(summary.get('proj1')?.totalCalls).toBe(2);
  });

  it('getProjectStats returns per-project stats', async () => {
    service.log(dto);
    service.log({ ...dto, isError: true, responseTimeMs: 200 });
    const stats = await service.getProjectStats('proj1');
    expect(stats.total).toBe(2);
    expect(stats.errors).toBe(1);
    expect(stats.avgResponseMs).toBe(160);
  });
});
