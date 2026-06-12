import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.schema';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

const makeUserDoc = (overrides: Record<string, any> = {}) => ({
  _id: 'user123',
  username: 'testuser',
  email: 'test@test.com',
  password: 'hashed',
  role: 'user',
  save: jest.fn().mockResolvedValue(undefined),
  toObject: jest.fn().mockReturnValue({
    _id: 'user123', username: 'testuser', email: 'test@test.com', password: 'hashed', role: 'user',
  }),
  ...overrides,
});

const exec = (value: any) => ({ exec: jest.fn().mockResolvedValue(value) });

const mockModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('resolves the user document', async () => {
      const doc = makeUserDoc();
      mockModel.findOne.mockResolvedValue(doc);
      expect(await service.findByUsername('testuser')).toBe(doc);
      expect(mockModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    });

    it('returns null when user does not exist', async () => {
      mockModel.findOne.mockResolvedValue(null);
      expect(await service.findByUsername('unknown')).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns the user document', async () => {
      const doc = makeUserDoc();
      mockModel.findOne.mockResolvedValue(doc);
      expect(await service.findByEmail('test@test.com')).toBe(doc);
    });

    it('returns null when email not found', async () => {
      mockModel.findOne.mockResolvedValue(null);
      expect(await service.findByEmail('none@test.com')).toBeNull();
    });
  });

  describe('create', () => {
    it('hashes password and persists user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pw');
      const doc = makeUserDoc();
      mockModel.create.mockResolvedValue(doc);

      const result = await service.create('newuser', 'plainpass', 'new@test.com');

      expect(bcrypt.hash).toHaveBeenCalledWith('plainpass', 10);
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newuser', email: 'new@test.com', password: 'hashed_pw' }),
      );
      expect(result).toBe(doc);
    });

    it('lowercases and trims username and email', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('h');
      mockModel.create.mockResolvedValue(makeUserDoc());
      await service.create('  NewUser  ', 'pass', '  New@Test.com  ');
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newuser', email: 'new@test.com' }),
      );
    });
  });

  describe('validatePassword', () => {
    it('returns true when password matches', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      expect(await service.validatePassword('plain', 'hash')).toBe(true);
    });

    it('returns false when password does not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      expect(await service.validatePassword('wrong', 'hash')).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const doc = makeUserDoc();
      mockModel.findById.mockReturnValue(exec(doc));
      expect(await service.findById('user123')).toBe(doc);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockModel.findById.mockReturnValue(exec(null));
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSelf', () => {
    it('throws BadRequestException when newPassword given without currentPassword', async () => {
      mockModel.findById.mockReturnValue(exec(makeUserDoc()));
      await expect(service.updateSelf('user123', { newPassword: 'newpass' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when currentPassword is wrong', async () => {
      mockModel.findById.mockReturnValue(exec(makeUserDoc()));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.updateSelf('user123', { currentPassword: 'wrong', newPassword: 'newpass' })).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when username is already taken', async () => {
      mockModel.findById.mockReturnValue(exec(makeUserDoc()));
      mockModel.findOne.mockResolvedValue(makeUserDoc({ username: 'taken' }));
      await expect(service.updateSelf('user123', { username: 'taken' })).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when email is already taken', async () => {
      mockModel.findById.mockReturnValue(exec(makeUserDoc()));
      mockModel.findOne.mockResolvedValue(makeUserDoc({ email: 'taken@test.com' }));
      await expect(service.updateSelf('user123', { email: 'taken@test.com' })).rejects.toThrow(ConflictException);
    });

    it('saves and returns user without password field', async () => {
      const doc = makeUserDoc();
      mockModel.findById.mockReturnValue(exec(doc));
      mockModel.findOne.mockResolvedValue(null);
      await service.updateSelf('user123', { username: 'newname' });
      expect(doc.save).toHaveBeenCalled();
    });
  });

  describe('updateByAdmin', () => {
    it('updates role and saves', async () => {
      const doc = makeUserDoc();
      mockModel.findById.mockReturnValue(exec(doc));
      mockModel.findOne.mockResolvedValue(null);
      await service.updateByAdmin('user123', { role: 'admin' });
      expect(doc.role).toBe('admin');
      expect(doc.save).toHaveBeenCalled();
    });

    it('hashes new password when provided', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      const doc = makeUserDoc();
      mockModel.findById.mockReturnValue(exec(doc));
      mockModel.findOne.mockResolvedValue(null);
      await service.updateByAdmin('user123', { password: 'newplain' });
      expect(doc.password).toBe('new_hash');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockModel.findByIdAndDelete.mockReturnValue(exec(null));
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('resolves without error when user exists', async () => {
      mockModel.findByIdAndDelete.mockReturnValue(exec(makeUserDoc()));
      await expect(service.remove('user123')).resolves.toBeUndefined();
    });
  });
});
