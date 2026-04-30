import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ApiKeyGuard } from '../../common/guards/api-key.guard.js';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    NotificationsModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ApiKeyGuard,
    CombinedAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, ApiKeyGuard, CombinedAuthGuard],
})
export class AuthModule {}
