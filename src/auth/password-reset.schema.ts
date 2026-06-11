import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PasswordResetDocument = PasswordReset & Document;

@Schema({ timestamps: true })
export class PasswordReset {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true, unique: true }) token: string;
  @Prop({ required: true }) expiresAt: Date;
  @Prop({ default: false }) used: boolean;
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
