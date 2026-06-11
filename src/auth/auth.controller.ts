import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local.guard';

const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  login(@Request() req: any): { access_token: string } {
    return this.authService.login(req.user);
  }

  @Post('register')
  @HttpCode(201)
  async register(@Body() body: unknown): Promise<{ access_token: string }> {
    const { username, email, password } = RegisterSchema.parse(body);
    return this.authService.register(username, password, email);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body('email') email: string): Promise<{ message: string }> {
    if (!email) throw new Error('E-mail é obrigatório.');
    await this.authService.forgotPassword(email);
    return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    if (!token || !newPassword) throw new Error('Token e nova senha são obrigatórios.');
    if (newPassword.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Senha redefinida com sucesso.' };
  }
}
