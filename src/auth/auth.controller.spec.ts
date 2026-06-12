import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  login: jest.fn().mockReturnValue({ access_token: 'tok' }),
  register: jest.fn().mockResolvedValue({ access_token: 'tok' }),
  forgotPassword: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
    mockAuthService.login.mockReturnValue({ access_token: 'tok' });
    mockAuthService.register.mockResolvedValue({ access_token: 'tok' });
    mockAuthService.forgotPassword.mockResolvedValue(undefined);
    mockAuthService.resetPassword.mockResolvedValue(undefined);
  });

  describe('login', () => {
    it('delegates to authService.login with req.user', () => {
      const req = { user: { _id: 'u1', username: 'admin', role: 'admin' } };
      expect(controller.login(req)).toEqual({ access_token: 'tok' });
      expect(mockAuthService.login).toHaveBeenCalledWith(req.user);
    });
  });

  describe('register', () => {
    it('parses body and calls authService.register with correct args', async () => {
      const body = { username: 'newuser', email: 'new@test.com', password: 'secret123' };
      const result = await controller.register(body);
      expect(result).toEqual({ access_token: 'tok' });
      expect(mockAuthService.register).toHaveBeenCalledWith('newuser', 'secret123', 'new@test.com');
    });

    it('throws ZodError when username is too short', async () => {
      await expect(controller.register({ username: 'ab', email: 'a@b.com', password: 'pass123' })).rejects.toThrow();
    });

    it('throws ZodError when email is invalid', async () => {
      await expect(controller.register({ username: 'validuser', email: 'not-email', password: 'pass123' })).rejects.toThrow();
    });

    it('throws ZodError when password is too short', async () => {
      await expect(controller.register({ username: 'validuser', email: 'a@b.com', password: '123' })).rejects.toThrow();
    });
  });

  describe('forgotPassword', () => {
    it('returns message without revealing if email exists', async () => {
      const result = await controller.forgotPassword('user@test.com');
      expect(result.message).toBeDefined();
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('user@test.com');
    });

    it('throws when email is empty', async () => {
      await expect(controller.forgotPassword('')).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('returns success message', async () => {
      const result = await controller.resetPassword('valid-tok', 'newpassword');
      expect(result).toEqual({ message: 'Senha redefinida com sucesso.' });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('valid-tok', 'newpassword');
    });

    it('throws when token is missing', async () => {
      await expect(controller.resetPassword('', 'newpass123')).rejects.toThrow();
    });

    it('throws when newPassword is missing', async () => {
      await expect(controller.resetPassword('tok', '')).rejects.toThrow();
    });

    it('throws when password is shorter than 6 chars', async () => {
      await expect(controller.resetPassword('tok', 'abc')).rejects.toThrow();
    });
  });
});
