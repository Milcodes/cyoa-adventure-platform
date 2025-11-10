import { Module } from '@nestjs/common';
import { GameplayController } from './gameplay.controller';
import { GameplayService } from './gameplay.service';
import { GameEngineModule } from '../game-engine/game-engine.module';

/**
 * GameplayModule
 *
 * Provides REST API endpoints for CYOA gameplay.
 * Integrates with GameEngineModule for game logic.
 */
@Module({
  imports: [GameEngineModule],
  controllers: [GameplayController],
  providers: [GameplayService],
  exports: [GameplayService],
})
export class GameplayModule {}
