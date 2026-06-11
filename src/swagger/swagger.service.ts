import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as yaml from 'js-yaml';
import { parseSpec } from '../dynamic-mcp/openapi-parser';
import { generateTools } from '../dynamic-mcp/tool-generator';
import type { AuthConfig } from '../dynamic-mcp/types';
import {
  McpApiKeyEntry,
  SwaggerProject,
  SwaggerProjectDocument,
} from './swagger-project.schema';

@Injectable()
export class SwaggerService {
  private readonly logger = new Logger(SwaggerService.name);

  constructor(
    @InjectModel(SwaggerProject.name)
    private readonly projectModel: Model<SwaggerProjectDocument>,
  ) {}

  /** Parse YAML ou JSON para objeto */
  private parseContent(content: string, filename: string): Record<string, any> {
    try {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
        return yaml.load(content) as Record<string, any>;
      }
      return JSON.parse(content);
    } catch {
      throw new BadRequestException(
        'Não foi possível fazer o parse do arquivo. Verifique se é um JSON ou YAML válido.',
      );
    }
  }

  /** Valida versão mínima do spec */
  private validateSpec(spec: Record<string, any>): void {
    const isSwagger2 = spec.swagger === '2.0';
    const isOpenApi3 = typeof spec.openapi === 'string' && spec.openapi.startsWith('3.');
    if (!isSwagger2 && !isOpenApi3) {
      throw new BadRequestException(
        'Arquivo inválido: deve ser Swagger 2.0 ou OpenAPI 3.x.',
      );
    }
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      throw new BadRequestException(
        'Arquivo inválido: nenhum endpoint (paths) encontrado.',
      );
    }
  }

  /**
   * Cria um projeto a partir do conteúdo do arquivo.
   * 1. Parse YAML/JSON
   * 2. Validação rápida
   * 3. Passa para swagger-parser (resolve $ref)
   * 4. Gera tools com inputSchema + endpointRef/parameterMap
   * 5. Persiste no MongoDB
   */
  /** Faz o parse do spec e retorna um preview das tools sem salvar no banco */
  async previewSpec(
    content: string,
    filename: string,
    baseUrlOverride?: string,
  ): Promise<{
    name: string;
    version?: string;
    description?: string;
    resolvedBaseUrl: string;
    totalTools: number;
    tools: Array<{ name: string; description?: string; method: string; path: string }>;
  }> {
    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);

    let normalizedSpec: Awaited<ReturnType<typeof parseSpec>>;
    try {
      normalizedSpec = await parseSpec(rawSpec);
    } catch (err: any) {
      throw new BadRequestException(`Erro ao processar o spec: ${err?.message ?? err}`);
    }

    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || 'http://localhost';
    const tools = generateTools(normalizedSpec, baseUrl);

    return {
      name: normalizedSpec.info.title,
      version: normalizedSpec.info.version,
      description: normalizedSpec.info.description,
      resolvedBaseUrl: baseUrl,
      totalTools: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        method: t.endpointRef.method,
        path: t.endpointRef.path,
      })),
    };
  }

  async create(
    content: string,
    filename: string,
    baseUrlOverride?: string,
    auth?: AuthConfig,
  ): Promise<SwaggerProjectDocument> {
    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);

    let normalizedSpec: Awaited<ReturnType<typeof parseSpec>>;
    try {
      normalizedSpec = await parseSpec(rawSpec);
    } catch (err: any) {
      throw new BadRequestException(`Erro ao processar o spec: ${err?.message ?? err}`);
    }

    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || 'http://localhost';
    const tools = generateTools(normalizedSpec, baseUrl);

    this.logger.log(
      `Projeto "${normalizedSpec.info.title}" importado: ${tools.length} tools geradas`,
    );

    return this.projectModel.create({
      name: normalizedSpec.info.title ?? filename.replace(/\.(ya?ml|json)$/i, ''),
      baseUrl,
      description: normalizedSpec.info.description,
      version: normalizedSpec.info.version,
      rawSpec,
      tools,
      auth: auth ?? { type: 'none' },
      status: 'active',
    });
  }

  findAll(tags?: string[]): Promise<SwaggerProjectDocument[]> {
    const filter: Record<string, any> = {};
    if (tags && tags.length > 0) filter.tags = { $all: tags };
    return this.projectModel
      .find(filter)
      .select('-rawSpec -tools.endpointRef -mcpApiKey')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateTags(id: string, tags: string[]): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, { tags: tags.map((t) => t.trim()).filter(Boolean) }, { new: true })
      .exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async updateRateLimit(
    id: string,
    dto: { enabled: boolean; requestsPerMinute: number },
  ): Promise<SwaggerProjectDocument> {
    if (dto.requestsPerMinute < 1 || dto.requestsPerMinute > 10_000) {
      throw new BadRequestException('requestsPerMinute deve estar entre 1 e 10000.');
    }
    const project = await this.projectModel
      .findByIdAndUpdate(id, { rateLimit: dto }, { new: true })
      .exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async duplicate(id: string): Promise<SwaggerProjectDocument> {
    const source = await this.projectModel.findById(id).exec();
    if (!source) throw new NotFoundException('Projeto não encontrado.');

    const obj = source.toObject() as any;
    delete obj._id;
    delete obj.mcpApiKey;
    delete obj.createdAt;
    delete obj.updatedAt;
    delete obj.__v;

    return this.projectModel.create({
      ...obj,
      name: `${source.name} (cópia)`,
    });
  }

  async findOne(id: string): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async remove(id: string): Promise<void> {
    const project = await this.projectModel.findByIdAndDelete(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
  }

  /** Legacy — mantido para backward-compat */
  async generateApiKey(id: string): Promise<{ mcpApiKey: string }> {
    const key = crypto.randomBytes(32).toString('hex');
    const project = await this.projectModel
      .findByIdAndUpdate(id, { mcpApiKey: key }, { new: true })
      .exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return { mcpApiKey: key };
  }

  /** Legacy — mantido para backward-compat */
  async revokeApiKey(id: string): Promise<void> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, { $unset: { mcpApiKey: 1 } })
      .exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
  }

  /** Cria uma nova API key nomeada e adiciona ao array mcpApiKeys */
  async addApiKey(id: string, name: string): Promise<McpApiKeyEntry> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const entry: McpApiKeyEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      key: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date(),
    };

    (project.mcpApiKeys as any).push(entry);
    project.markModified('mcpApiKeys');
    await project.save();
    return entry;
  }

  /** Remove uma API key pelo id */
  async removeApiKey(id: string, keyId: string): Promise<void> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const idx = project.mcpApiKeys.findIndex((k) => k.id === keyId);
    if (idx === -1) throw new NotFoundException('Key não encontrada.');

    (project.mcpApiKeys as any).splice(idx, 1);
    project.markModified('mcpApiKeys');
    await project.save();
  }

  /**
   * Re-importa um spec em um projeto existente.
   * - Tools com mesmo nome: atualiza inputSchema + endpointRef (preserva enabled/description)
   * - Tools novas no spec: adiciona
   * - Tools que sumiram do spec: NÃO remove (usuário deleta manualmente)
   * - Atualiza rawSpec e baseUrl se fornecido
   */
  async reimportSpec(
    id: string,
    content: string,
    filename: string,
    baseUrlOverride?: string,
  ): Promise<{ added: number; updated: number; baseUrl: string }> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const rawSpec = this.parseContent(content, filename);
    this.validateSpec(rawSpec);

    let normalizedSpec: Awaited<ReturnType<typeof parseSpec>>;
    try {
      normalizedSpec = await parseSpec(rawSpec);
    } catch (err: any) {
      throw new BadRequestException(`Erro ao processar o spec: ${err?.message ?? err}`);
    }

    const baseUrl = baseUrlOverride?.trim() || normalizedSpec.servers[0]?.url || project.baseUrl;
    const newTools = generateTools(normalizedSpec, baseUrl);

    let added = 0;
    let updated = 0;

    for (const newTool of newTools) {
      const existingIdx = project.tools.findIndex((t) => t.name === newTool.name);
      if (existingIdx === -1) {
        (project.tools as any).push(newTool);
        added++;
      } else {
        const existing = project.tools[existingIdx] as any;
        existing.inputSchema = newTool.inputSchema;
        existing.endpointRef = newTool.endpointRef;
        updated++;
      }
    }

    project.rawSpec = rawSpec;
    project.baseUrl = baseUrl;
    project.markModified('tools');
    await project.save();

    this.logger.log(`Re-import "${project.name}": +${added} adicionadas, ${updated} atualizadas`);
    return { added, updated, baseUrl };
  }

  /** Cria um projeto vazio sem ferramentas */
  async createEmpty(dto: {
    name: string;
    description?: string;
    baseUrl: string;
  }): Promise<SwaggerProjectDocument> {
    return this.projectModel.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      baseUrl: dto.baseUrl.trim(),
      tools: [],
      auth: { type: 'none' },
      status: 'active',
    });
  }

  /** Atualiza somente a configuração de auth do projeto */
  async updateAuth(id: string, auth: AuthConfig): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, { auth }, { new: true })
      .exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  /** Atualiza nome e/ou descrição do projeto */
  async updateInfo(
    id: string,
    dto: { name?: string; description?: string },
  ): Promise<SwaggerProjectDocument> {
    const updates: Record<string, any> = {};
    if (dto.name?.trim()) updates.name = dto.name.trim();
    if (dto.description !== undefined) updates.description = dto.description.trim() || undefined;

    const project = await this.projectModel
      .findByIdAndUpdate(id, { $set: updates }, { new: true })
      .exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  /** Atualiza nome, descrição e/ou enabled de uma tool */
  async updateToolMeta(
    id: string,
    currentName: string,
    dto: { name?: string; description?: string; enabled?: boolean },
  ): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const tool = project.tools.find((t) => t.name === currentName);
    if (!tool) throw new NotFoundException(`Tool "${currentName}" não encontrada.`);

    if (dto.name?.trim()) tool.name = dto.name.trim();
    if (dto.description !== undefined) tool.description = dto.description.trim() || undefined;
    if (typeof dto.enabled === 'boolean') (tool as any).enabled = dto.enabled;

    project.markModified('tools');
    return project.save();
  }

  /** Remove permanentemente uma tool do projeto */
  async removeTool(id: string, toolName: string): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const idx = project.tools.findIndex((t) => t.name === toolName);
    if (idx === -1) throw new NotFoundException(`Tool "${toolName}" não encontrada.`);

    (project.tools as any).splice(idx, 1);
    project.markModified('tools');
    return project.save();
  }

  /** Substitui todos os campos de uma tool (exceto a busca pelo nome atual) */
  async updateTool(
    id: string,
    currentName: string,
    dto: {
      name: string;
      description?: string;
      method: string;
      path: string;
      baseUrl: string;
      contentType?: string;
      parameterMap: Record<string, unknown>[];
      inputSchema: Record<string, unknown>;
    },
  ): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const idx = project.tools.findIndex((t) => t.name === currentName);
    if (idx === -1) throw new NotFoundException(`Tool "${currentName}" não encontrada.`);

    (project.tools as any)[idx] = {
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      inputSchema: dto.inputSchema,
      endpointRef: {
        method: dto.method.toUpperCase(),
        path: dto.path.trim(),
        baseUrl: dto.baseUrl.trim(),
        contentType: dto.contentType?.trim() || 'application/json',
        parameterMap: dto.parameterMap,
      },
    };

    project.markModified('tools');
    return project.save();
  }

  /** Adiciona uma nova tool ao projeto */
  async addTool(
    id: string,
    dto: {
      name: string;
      description?: string;
      method: string;
      path: string;
      baseUrl: string;
      contentType?: string;
      parameterMap: Record<string, unknown>[];
      inputSchema: Record<string, unknown>;
    },
  ): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const nameClean = dto.name.trim();
    if (project.tools.find((t) => t.name === nameClean)) {
      throw new BadRequestException(`Já existe uma ferramenta com o nome "${nameClean}".`);
    }

    (project.tools as any).push({
      name: nameClean,
      description: dto.description?.trim() || undefined,
      inputSchema: dto.inputSchema,
      endpointRef: {
        method: dto.method.toUpperCase(),
        path: dto.path.trim(),
        baseUrl: dto.baseUrl.trim(),
        contentType: dto.contentType?.trim() || 'application/json',
        parameterMap: dto.parameterMap,
      },
    });

    project.markModified('tools');
    return project.save();
  }

  /**
   * Atualiza a baseUrl do projeto e propaga para endpointRef de todas as tools.
   * É necessário atualizar endpointRef.baseUrl porque é lido em tempo de execução
   * pelo DynamicMcpService sem re-parsear o spec.
   */
  async updateBaseUrl(id: string, baseUrl: string): Promise<SwaggerProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    project.baseUrl = baseUrl;
    project.tools = (project.tools ?? []).map((t) => ({
      ...t,
      endpointRef: t.endpointRef ? { ...t.endpointRef, baseUrl } : t.endpointRef,
    })) as typeof project.tools;
    project.markModified('tools');

    return project.save();
  }
}
