import { Injectable, UnauthorizedException, NotImplementedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: number;
  refreshTtl: number;
}

interface UserForAuth {
  id: string;
  tenantId: string;
  organizationId: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private jwtCfg(): JwtConfig {
    return this.config.get<JwtConfig>('jwt')!;
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.emailVerifiedAt) throw new UnauthorizedException('Email not verified');

    const roleKeys = user.roles.map((ur) => ur.role.key);
    const tokens = await this.issueTokens(user, roleKeys, ip);
    await this.audit(user.tenantId, user.id, AuditAction.LOGIN);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        roles: roleKeys,
        organizationId: user.organizationId,
      },
    };
  }

  private async issueTokens(user: UserForAuth, roleKeys: string[], ip?: string, familyId?: string) {
    const cfg = this.jwtCfg();
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, tid: user.tenantId, oid: user.organizationId, roles: roleKeys },
      { secret: cfg.accessSecret, expiresIn: cfg.accessTtl },
    );

    const rawRefresh = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: this.sha256(rawRefresh),
        familyId: familyId ?? randomUUID(),
        ip: ip ?? null,
        expiresAt: new Date(Date.now() + cfg.refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken: rawRefresh, expiresIn: cfg.accessTtl };
  }

  async refresh(rawRefresh: string | undefined, ip?: string) {
    if (!rawRefresh) throw new UnauthorizedException('Missing refresh token');
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.sha256(rawRefresh) },
    });
    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    // Reuse detection: a revoked token presented again → revoke the whole family.
    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (existing.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

    // Rotate.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findFirst({
      where: { id: existing.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException();
    const roleKeys = user.roles.map((ur) => ur.role.key);
    return this.issueTokens(user, roleKeys, ip, existing.familyId);
  }

  async logout(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.sha256(rawRefresh) },
    });
    if (existing && !existing.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
      await this.audit(existing.tenantId, existing.userId, AuditAction.LOGOUT);
    }
  }

  // Email verification / password reset: token plumbing lands with the Users
  // module in Phase 6; the contracts exist here so the routes are wired.
  async forgotPassword(_email: string): Promise<void> {
    return;
  }

  async resetPassword(_token: string, _password: string): Promise<void> {
    throw new NotImplementedException('Password reset is implemented with the Users module (Phase 6)');
  }

  async verifyEmail(_token: string): Promise<void> {
    throw new NotImplementedException('Email verification is implemented with the Users module (Phase 6)');
  }

  private async audit(tenantId: string, actorId: string, action: AuditAction): Promise<void> {
    await this.prisma.auditLog.create({ data: { tenantId, actorId, action } });
  }
}
