/// <reference types="multer" />
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { AuthConfig } from '../dynamic-mcp/types';
import { SwaggerService } from './swagger.service';

@Controller('swagger')
@UseGuards(JwtAuthGuard)
export class SwaggerController {
  constructor(private readonly swaggerService: SwaggerService) {}

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Query('baseUrl') baseUrl?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.yaml') && !lower.endsWith('.yml') && !lower.endsWith('.json')) {
      throw new BadRequestException('Formato inválido. Envie um arquivo .yaml, .yml ou .json.');
    }
    return this.swaggerService.previewSpec(
      file.buffer.toString('utf-8'),
      file.originalname,
      baseUrl,
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('baseUrl') baseUrl?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');

    const lower = file.originalname.toLowerCase();
    if (!lower.endsWith('.yaml') && !lower.endsWith('.yml') && !lower.endsWith('.json')) {
      throw new BadRequestException('Formato inválido. Envie um arquivo .yaml, .yml ou .json.');
    }

    const project = await this.swaggerService.create(
      file.buffer.toString('utf-8'),
      file.originalname,
      baseUrl,
    );

    // Retorna resumo sem o rawSpec e parameterMap completo
    return {
      _id: project._id,
      name: project.name,
      baseUrl: project.baseUrl,
      description: project.description,
      version: project.version,
      status: project.status,
      toolCount: project.tools.length,
      tools: project.tools.map((t) => ({ name: t.name, description: t.description })),
    };
  }

  @Post('projects')
  createEmpty(@Body() dto: { name?: string; description?: string; baseUrl?: string }) {
    if (!dto.name?.trim()) throw new BadRequestException('Nome é obrigatório.');
    if (!dto.baseUrl?.trim()) throw new BadRequestException('Base URL é obrigatória.');
    return this.swaggerService.createEmpty(dto as any);
  }

  @Get('projects')
  findAll(@Query('tags') tags?: string) {
    const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    return this.swaggerService.findAll(tagList);
  }

  @Get('projects/:id')
  findOne(@Param('id') id: string) {
    return this.swaggerService.findOne(id);
  }

  @Patch('projects/:id/info')
  updateInfo(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string },
  ) {
    return this.swaggerService.updateInfo(id, dto);
  }

  @Patch('projects/:id/tools/:toolName')
  updateToolMeta(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() dto: { name?: string; description?: string; enabled?: boolean },
  ) {
    return this.swaggerService.updateToolMeta(id, toolName, dto);
  }

  @Put('projects/:id/tools/:toolName')
  updateTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Body() dto: any,
  ) {
    return this.swaggerService.updateTool(id, toolName, dto);
  }

  @Post('projects/:id/tools')
  addTool(@Param('id') id: string, @Body() dto: any) {
    return this.swaggerService.addTool(id, dto);
  }

  @Delete('projects/:id/tools/:toolName')
  removeTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
  ) {
    return this.swaggerService.removeTool(id, toolName);
  }

  @Post('projects/:id/api-key')
  generateApiKey(@Param('id') id: string) {
    return this.swaggerService.generateApiKey(id);
  }

  @Delete('projects/:id/api-key')
  @HttpCode(204)
  revokeApiKey(@Param('id') id: string) {
    return this.swaggerService.revokeApiKey(id);
  }

  @Patch('projects/:id/auth')
  updateAuth(@Param('id') id: string, @Body() auth: AuthConfig) {
    return this.swaggerService.updateAuth(id, auth);
  }

  @Patch('projects/:id/base-url')
  updateBaseUrl(
    @Param('id') id: string,
    @Body('baseUrl') baseUrl: string,
  ) {
    if (!baseUrl?.trim()) throw new BadRequestException('baseUrl não pode ser vazia.');
    return this.swaggerService.updateBaseUrl(id, baseUrl.trim());
  }

  @Patch('projects/:id/rate-limit')
  updateRateLimit(
    @Param('id') id: string,
    @Body() dto: { enabled: boolean; requestsPerMinute: number },
  ) {
    return this.swaggerService.updateRateLimit(id, dto);
  }

  @Post('projects/:id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.swaggerService.duplicate(id);
  }

  @Patch('projects/:id/tags')
  updateTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    if (!Array.isArray(tags)) throw new BadRequestException('tags deve ser um array de strings.');
    return this.swaggerService.updateTags(id, tags);
  }

  @Delete('projects/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.swaggerService.remove(id);
  }
}
