import { Module } from '@nestjs/common';
import { DiceRollerService } from './dice-roller.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { EffectProcessorService } from './effect-processor.service';
import { StateManagerService } from './state-manager.service';
import { StoryNavigatorService } from './story-navigator.service';

/**
 * GameEngineModule
 *
 * Provides core game engine services for CYOA gameplay:
 * - DiceRollerService: Dice rolls and randomness
 * - ConditionEvaluatorService: JSONLogic condition evaluation
 * - EffectProcessorService: Effect application to game state
 * - StateManagerService: Game state lifecycle management
 * - StoryNavigatorService: Story navigation orchestration
 *
 * Import this module in other modules that need game engine functionality.
 */
@Module({
  providers: [
    DiceRollerService,
    ConditionEvaluatorService,
    EffectProcessorService,
    StateManagerService,
    StoryNavigatorService,
  ],
  exports: [
    DiceRollerService,
    ConditionEvaluatorService,
    EffectProcessorService,
    StateManagerService,
    StoryNavigatorService,
  ],
})
export class GameEngineModule {}
