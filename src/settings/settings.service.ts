import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './settings.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private readonly model: Model<SettingsDocument>,
  ) {}

  async get(): Promise<SettingsDocument> {
    let doc = await this.model.findOne({ key: 'global' }).exec();
    if (!doc) {
      doc = await this.model.create({ key: 'global' });
    }
    return doc;
  }

  async update(dto: Partial<Omit<Settings, 'key'>>): Promise<SettingsDocument> {
    const doc = await this.model.findOneAndUpdate(
      { key: 'global' },
      { $set: dto },
      { new: true, upsert: true },
    ).exec();
    return doc!;
  }

  /** Retorna apenas o smtpPass mascarado — não expõe a senha real na API */
  async getSafe(): Promise<Omit<SettingsDocument, 'smtpPass'> & { smtpPassSet: boolean }> {
    const doc = await this.get();
    const obj = doc.toObject() as any;
    const smtpPassSet = !!obj.smtpPass;
    delete obj.smtpPass;
    return { ...obj, smtpPassSet };
  }
}
