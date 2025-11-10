import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      display_name: 'Test User',
      preferred_language: 'en',
      role: UserRole.player,
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const createdUser = {
        id: '123',
        email: registerDto.email,
        pw_hash: hashedPassword,
        display_name: registerDto.display_name,
        preferred_language: registerDto.preferred_language,
        role: registerDto.role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
        flags: {},
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockPrismaService.user.update.mockResolvedValue(createdUser);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('pw_hash');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '123' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid role', async () => {
      const invalidRegisterDto = {
        ...registerDto,
        role: UserRole.admin, // Regular users can't register as admin
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.register(invalidRegisterDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const user = {
        id: '123',
        email: loginDto.email,
        pw_hash: hashedPassword,
        display_name: 'Test User',
        preferred_language: 'en',
        role: UserRole.player,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
        flags: {},
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('pw_hash');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const user = {
        id: '123',
        email: loginDto.email,
        pw_hash: await bcrypt.hash('different-password', 10),
        is_active: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const user = {
        id: '123',
        email: loginDto.email,
        pw_hash: await bcrypt.hash(loginDto.password, 10),
        is_active: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new access token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = {
        sub: '123',
        email: 'test@example.com',
        role: UserRole.player,
      };
      const user = {
        id: '123',
        email: 'test@example.com',
        is_active: true,
        role: UserRole.player,
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        pw_hash: 'hashed-password',
        display_name: 'Test User',
        role: UserRole.player,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.getProfile('123');

      expect(result).not.toHaveProperty('pw_hash');
      expect(result.email).toBe(user.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateLanguage', () => {
    it('should update user language', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        pw_hash: 'hashed-password',
        preferred_language: 'hu',
      };

      mockPrismaService.user.update.mockResolvedValue({
        ...user,
        preferred_language: 'en',
      });

      const result = await service.updateLanguage('123', 'en');

      expect(result.preferred_language).toBe('en');
      expect(result).not.toHaveProperty('pw_hash');
    });

    it('should throw BadRequestException for invalid language', async () => {
      await expect(service.updateLanguage('123', 'invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
