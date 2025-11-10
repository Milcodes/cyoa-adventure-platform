import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import { AuthResponse, JwtPayload } from '../../common/interfaces';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, display_name, preferred_language, role } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate role: non-admin users can only register as player or author
    if (role && role !== UserRole.player && role !== UserRole.author) {
      throw new BadRequestException('Invalid role. Only player and author roles are allowed');
    }

    // Hash password
    const saltRounds = 10;
    const pw_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        pw_hash,
        display_name,
        preferred_language: preferred_language || 'hu',
        role: role || UserRole.player,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update last_login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Remove password from response
    const { pw_hash: _, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.pw_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update last_login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Remove password from response
    const { pw_hash: _, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const access_token = await this.signAccessToken(user.id, user.email, user.role);

      return { access_token };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Remove password from response
    const { pw_hash: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async updateLanguage(userId: string, language: string) {
    const validLanguages = ['hu', 'de', 'en', 'es', 'fr'];

    if (!validLanguages.includes(language)) {
      throw new BadRequestException('Invalid language code');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { preferred_language: language },
    });

    const { pw_hash: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(userId, email, role),
      this.signRefreshToken(userId, email, role),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }

  private async signAccessToken(userId: string, email: string, role: UserRole): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });
  }

  private async signRefreshToken(userId: string, email: string, role: UserRole): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });
  }
}
