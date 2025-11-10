import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './api/auth/auth.module';
import { GameEngineModule } from './api/game-engine/game-engine.module';
import { GameplayModule } from './api/gameplay/gameplay.module';
import { StoryModule } from './api/story/story.module';
import { TranslationModule } from './api/translation/translation.module';
import { MediaModule } from './api/media/media.module';
import { ModerationModule } from './api/moderation/moderation.module';
import { AnalyticsModule } from './api/analytics/analytics.module';
import { HealthModule } from './api/health/health.module';
import { JwtAuthGuard, RolesGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    GameEngineModule,
    GameplayModule,
    StoryModule,
    TranslationModule,
    MediaModule,
    ModerationModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
