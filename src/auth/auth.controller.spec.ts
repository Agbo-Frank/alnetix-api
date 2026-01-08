import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';


describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService: jest.Mocked<AuthService> = {
    // Methods used by the controller
    register: jest.fn(),
    login: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    // Any other methods that might exist on AuthService can be added as needed
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate register() to AuthService.register with the provided dto and return its result', async () => {
    const dto: RegisterDto = {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      password: 'password123',
    };

    const result = { id: 'user-1', email: dto.email } as any;
    authService.register.mockResolvedValue(result);

    await expect(controller.register(dto)).resolves.toBe(result);
    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('should delegate login() to AuthService.login with the provided dto and return its result', async () => {
    const dto: LoginDto = {
      email: 'john.doe@example.com',
      password: 'password123',
    };

    const result = { accessToken: 'jwt.token.here' } as any;
    authService.login.mockResolvedValue(result);

    await expect(controller.login(dto)).resolves.toBe(result);
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('should delegate verifyEmail() to AuthService.verifyEmail with the provided token and return its result', async () => {
    const token = 'verification-token-123';
    const result = { message: 'Email verified' } as any;
    authService.verifyEmail.mockResolvedValue(result);

    await expect(controller.verifyEmail(token)).resolves.toBe(result);
    expect(authService.verifyEmail).toHaveBeenCalledTimes(1);
    expect(authService.verifyEmail).toHaveBeenCalledWith(token);
  });

  it('should delegate resendVerification() to AuthService.resendVerification with the email and return its result', async () => {
    const dto: ResendVerificationDto = { email: 'john.doe@example.com' };
    const result = { message: 'Verification email sent' } as any;
    authService.resendVerification.mockResolvedValue(result);

    await expect(controller.resendVerification(dto)).resolves.toBe(result);
    expect(authService.resendVerification).toHaveBeenCalledTimes(1);
    expect(authService.resendVerification).toHaveBeenCalledWith(dto.email);
  });

  it('should delegate forgotPassword() to AuthService.forgotPassword with the email and return its result', async () => {
    const dto: ForgotPasswordDto = { email: 'john.doe@example.com' };
    const result = { message: 'Password reset email sent' } as any;
    authService.forgotPassword.mockResolvedValue(result);

    await expect(controller.forgotPassword(dto)).resolves.toBe(result);
    expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
    expect(authService.forgotPassword).toHaveBeenCalledWith(dto.email);
  });

  it('should delegate resetPassword() to AuthService.resetPassword with the provided dto and return its result', async () => {
    const dto: ResetPasswordDto = { token: 'reset-token-123', password: 'newPassword123' };
    const result = { message: 'Password reset successful' } as any;
    authService.resetPassword.mockResolvedValue(result);

    await expect(controller.resetPassword(dto)).resolves.toBe(result);
    expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
  });
});
