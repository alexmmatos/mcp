import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

/** Documento singleton — sempre buscado/atualizado pelo mesmo _id lógico */
@Schema({ timestamps: true })
export class Settings {
  /** Slug fixo para garantir singleton */
  @Prop({ default: 'global', unique: true }) key: string;

  /** URL pública do servidor (usada nos exemplos curl do frontend) */
  @Prop({ default: '' }) serverBaseUrl: string;

  /** Timeout padrão para chamadas HTTP das tools (ms) */
  @Prop({ default: 30000 }) defaultTimeoutMs: number;

  /** SMTP para reset de senha */
  @Prop({ default: '' }) smtpHost: string;
  @Prop({ default: 587 }) smtpPort: number;
  @Prop({ default: '' }) smtpUser: string;
  @Prop({ default: '' }) smtpPass: string;
  @Prop({ default: '' }) smtpFrom: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
