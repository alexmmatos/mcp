import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async onApplicationBootstrap(): Promise<void> {
    const exists = await this.userModel.findOne({ username: 'admin' });
    if (!exists) {
      await this.create('admin', 'admin', 'admin@mcp-transform.io', 'admin');
    }
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username: username.toLowerCase().trim() });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  async create(
    username: string,
    password: string,
    email: string,
    role = 'user',
  ): Promise<UserDocument> {
    const hash = await bcrypt.hash(password, 10);
    return this.userModel.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      role,
    });
  }

  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async findAll(): Promise<Omit<UserDocument, 'password'>[]> {
    return this.userModel.find().select('-password').sort({ createdAt: -1 }).exec() as any;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  /** Atualização pelo próprio usuário — exige senha atual para trocar senha */
  async updateSelf(
    id: string,
    dto: { username?: string; email?: string; currentPassword?: string; newPassword?: string },
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.findById(id);

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException('Informe a senha atual para definir uma nova.');
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new BadRequestException('Senha atual incorreta.');
      user.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (dto.username && dto.username !== user.username) {
      const exists = await this.userModel.findOne({ username: dto.username.toLowerCase().trim() });
      if (exists) throw new ConflictException('Nome de usuário já em uso.');
      user.username = dto.username.toLowerCase().trim();
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() });
      if (exists) throw new ConflictException('E-mail já em uso.');
      user.email = dto.email.toLowerCase().trim();
    }

    await user.save();
    const { password: _, ...safe } = user.toObject();
    return safe as any;
  }

  /** Atualização por admin — pode alterar qualquer campo incluindo role */
  async updateByAdmin(
    id: string,
    dto: { username?: string; email?: string; password?: string; role?: string },
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.findById(id);

    if (dto.username && dto.username !== user.username) {
      const exists = await this.userModel.findOne({ username: dto.username.toLowerCase().trim() });
      if (exists) throw new ConflictException('Nome de usuário já em uso.');
      user.username = dto.username.toLowerCase().trim();
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() });
      if (exists) throw new ConflictException('E-mail já em uso.');
      user.email = dto.email.toLowerCase().trim();
    }

    if (dto.password) user.password = await bcrypt.hash(dto.password, 10);
    if (dto.role) user.role = dto.role;

    await user.save();
    const { password: _, ...safe } = user.toObject();
    return safe as any;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Usuário não encontrado.');
  }
}
