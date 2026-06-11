import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { PasswordReset, PasswordResetDocument } from './password-reset.schema';
import { SettingsService } from '../settings/settings.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

export interface AuthUser {
  _id: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly settingsService: SettingsService,
    @InjectModel(PasswordReset.name)
    private readonly resetModel: Model<PasswordResetDocument>,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthUser | null> {
    const user = await this.users.findByUsername(username);
    if (!user) return null;
    const valid = await this.users.validatePassword(password, user.password);
    if (!valid) return null;
    return { _id: String(user._id), username: user.username, role: user.role };
  }

  login(user: AuthUser): { access_token: string } {
    const payload: JwtPayload = { sub: user._id, username: user.username, role: user.role };
    return { access_token: this.jwt.sign(payload) };
  }

  async register(username: string, password: string, email: string): Promise<{ access_token: string }> {
    const [byUsername, byEmail] = await Promise.all([
      this.users.findByUsername(username),
      this.users.findByEmail(email),
    ]);
    if (byUsername || byEmail) throw new ConflictException('Usuário ou e-mail já cadastrado');
    const user = await this.users.create(username, password, email);
    return this.login({ _id: String(user._id), username: user.username, role: user.role });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return; // não revela se o e-mail existe

    // Invalida tokens anteriores
    await this.resetModel.deleteMany({ userId: String(user._id) }).exec();

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.resetModel.create({ userId: String(user._id), token, expiresAt });

    const settings = await this.settingsService.get();
    const baseUrl = settings.serverBaseUrl || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    if (settings.smtpHost && settings.smtpUser) {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          auth: { user: settings.smtpUser, pass: settings.smtpPass },
        });
        await transporter.sendMail({
          from: settings.smtpFrom || settings.smtpUser,
          to: email,
          subject: 'Redefinição de senha — Arthur MCP Adapter',
          text: `Clique no link para redefinir sua senha (válido por 1 hora):\n\n${resetLink}`,
          html: `<p>Clique no link para redefinir sua senha (válido por 1 hora):</p><p><a href="${resetLink}">${resetLink}</a></p>`,
        });
      } catch (err: any) {
        this.logger.error(`Falha ao enviar e-mail de reset: ${err?.message}`);
      }
    } else {
      this.logger.warn(`SMTP não configurado. Link de reset para ${email}: ${resetLink}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.resetModel.findOne({ token, used: false }).exec();
    if (!record) throw new BadRequestException('Token inválido ou já utilizado.');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expirado.');

    const user = await this.users.findById(record.userId);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    await this.users.updateByAdmin(record.userId, { password: newPassword });
    record.used = true;
    await record.save();
  }
}
