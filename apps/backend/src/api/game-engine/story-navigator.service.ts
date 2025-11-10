import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StateManagerService } from './state-manager.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { EffectProcessorService } from './effect-processor.service';
import { DiceRollerService } from './dice-roller.service';
import {
  GameState,
  Choice,
  StateTransition,
  RollResult,
} from './interfaces/game-state.interface';

/**
 * StoryNavigator Service
 *
 * Orchestrates story navigation by coordinating:
 * - Choice availability (conditions)
 * - Dice roll requirements
 * - Effect application
 * - Node transitions
 * - State updates
 *
 * This is the main entry point for gameplay logic.
 */
@Injectable()
export class StoryNavigatorService {
  private readonly logger = new Logger(StoryNavigatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateManager: StateManagerService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly effectProcessor: EffectProcessorService,
    private readonly diceRoller: DiceRollerService,
  ) {}

  /**
   * Get available choices for the current node
   * Filters choices based on conditions
   *
   * @param gameState - Current game state
   * @param language - Language for translations
   * @returns Array of available choices with translations
   */
  async getAvailableChoices(
    gameState: GameState,
    locale: string = 'hu',
  ): Promise<any[]> {
    // Fetch current node with choices
    const node = await this.prisma.storyNode.findUnique({
      where: { id: gameState.currentNodeId },
      include: {
        translations: {
          where: { locale },
        },
      },
    });

    if (!node) {
      throw new NotFoundException(
        `Node not found: ${gameState.currentNodeId}`,
      );
    }

    // Get choices from JSONB
    const choices = (node.choices as any[]) || [];

    // Filter choices by conditions and enrich with availability info
    const availableChoices = choices.map((choice: any, index: number) => {
      const conditions = choice.conditions || [];

      const availability = this.conditionEvaluator.checkAvailability(
        conditions,
        gameState,
      );

      return {
        index,
        text: choice.text,
        targetNodeId: choice.target_node_id,
        available: availability.available,
        conditions: choice.conditions,
        effects: choice.effects,
        rollRequirements: choice.roll_requirements,
        metadata: choice.metadata,
      };
    });

    return availableChoices;
  }

  /**
   * Process a player's choice and transition to the next node
   *
   * @param gameState - Current game state
   * @param choiceIndex - Index of the chosen option
   * @param language - Language for translations
   * @returns StateTransition with updated state and results
   */
  async makeChoice(
    gameState: GameState,
    choiceIndex: number,
    locale: string = 'hu',
  ): Promise<StateTransition> {
    // Fetch current node
    const node = await this.prisma.storyNode.findUnique({
      where: { id: gameState.currentNodeId },
      include: {
        translations: {
          where: { locale },
        },
      },
    });

    if (!node) {
      throw new NotFoundException(
        `Node not found: ${gameState.currentNodeId}`,
      );
    }

    const choices = (node.choices as any[]) || [];

    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      throw new BadRequestException(`Invalid choice index: ${choiceIndex}`);
    }

    const choice = choices[choiceIndex];

    // Validate choice conditions
    const conditions = choice.conditions || [];
    if (!this.conditionEvaluator.evaluateAll(conditions, gameState)) {
      throw new BadRequestException(
        'Choice conditions not met',
      );
    }

    // Process roll requirements if any
    const rollResults: RollResult[] = [];
    const rollRequirements = choice.roll_requirements || [];

    for (const rollReq of rollRequirements) {
      const statValue = gameState.stats[rollReq.stat];

      if (statValue === undefined) {
        throw new BadRequestException(
          `Stat not found: ${rollReq.stat}`,
        );
      }

      const rollResult = this.diceRoller.rollWithStatModifier(
        statValue,
        rollReq.difficulty,
      );

      rollResults.push(rollResult);

      // If roll fails, handle failure (could add failure effects here)
      if (!rollResult.success) {
        this.logger.warn(
          `Roll failed: ${rollReq.stat} (${statValue}) vs DC ${rollReq.difficulty}`,
        );
        // For now, we still allow the choice but record the failure
        // Story authors can check roll results in subsequent nodes
      }
    }

    // Clone state for safe mutation
    const newState = this.stateManager.cloneState(gameState);

    // Set seed for this turn if not already set
    if (newState.seed) {
      this.diceRoller.setSeed(
        `${newState.seed}-${newState.choicesHistory.length}`,
      );
    }

    // Apply choice effects
    const effects = choice.effects || [];
    const appliedEffects = this.effectProcessor.applyEffects(effects, newState);

    // Record the choice
    this.stateManager.recordChoice(
      newState,
      gameState.currentNodeId,
      choiceIndex,
      choice.text,
    );

    // Move to target node
    const targetNodeId = choice.target_node_id;
    this.stateManager.moveToNode(newState, targetNodeId);

    // Process status effect durations
    this.effectProcessor.processStatusEffectDurations(newState);

    // Create transition result
    const transition: StateTransition = {
      previousNodeId: gameState.currentNodeId,
      newNodeId: targetNodeId,
      appliedEffects,
      updatedState: newState,
      rollResults: rollResults.length > 0 ? rollResults : undefined,
    };

    this.logger.log(
      `Choice processed: ${gameState.currentNodeId} → ${targetNodeId}`,
    );

    return transition;
  }

  /**
   * Get the current node content with translations
   *
   * @param nodeId - Node ID
   * @param locale - Locale code
   * @returns Node with translated content
   */
  async getNodeContent(nodeId: string, locale: string = 'hu'): Promise<any> {
    const node = await this.prisma.storyNode.findUnique({
      where: { id: nodeId },
      include: {
        translations: {
          where: { locale },
        },
      },
    });

    if (!node) {
      throw new NotFoundException(`Node not found: ${nodeId}`);
    }

    // Get translation or fall back to default
    const translation = node.translations?.[0];

    return {
      id: node.id,
      key: node.key,
      textMd: translation?.text_md || node.text_md,
      mediaRef: node.media_ref,
      layout: node.layout,
      isTerminal: node.is_terminal,
      choices: node.choices,
      conditions: node.conditions,
      effects: node.effects,
      diceChecks: node.dice_checks,
    };
  }

  /**
   * Check if the current node is a terminal node (ending)
   *
   * @param gameState - Current game state
   * @returns true if current node is terminal
   */
  async isAtEnding(gameState: GameState): Promise<boolean> {
    const node = await this.prisma.storyNode.findUnique({
      where: { id: gameState.currentNodeId },
      select: { is_terminal: true },
    });

    return node?.is_terminal || false;
  }

  /**
   * Get story progress statistics
   *
   * @param gameState - Current game state
   * @returns Progress stats
   */
  async getProgress(gameState: GameState): Promise<{
    totalNodes: number;
    visitedNodes: number;
    progressPercentage: number;
    choicesMade: number;
  }> {
    // Get total nodes in story
    const totalNodes = await this.prisma.storyNode.count({
      where: { story_id: gameState.storyId },
    });

    const visitedNodes = gameState.visitedNodes.length;
    const progressPercentage = totalNodes > 0
      ? Math.round((visitedNodes / totalNodes) * 100)
      : 0;

    return {
      totalNodes,
      visitedNodes,
      progressPercentage,
      choicesMade: this.stateManager.getChoiceCount(gameState),
    };
  }

  /**
   * Validate that a choice can be made
   * Used for pre-validation before actually making the choice
   *
   * @param gameState - Current game state
   * @param choiceIndex - Index of the choice
   * @returns Validation result with details
   */
  async validateChoice(
    gameState: GameState,
    choiceIndex: number,
  ): Promise<{
    valid: boolean;
    reason?: string;
    failedConditions?: any[];
  }> {
    const node = await this.prisma.storyNode.findUnique({
      where: { id: gameState.currentNodeId },
    });

    if (!node) {
      return { valid: false, reason: 'Node not found' };
    }

    const choices = (node.choices as any[]) || [];

    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      return { valid: false, reason: 'Invalid choice index' };
    }

    const choice = choices[choiceIndex];
    const conditions = choice.conditions || [];

    const availability = this.conditionEvaluator.checkAvailability(
      conditions,
      gameState,
    );

    if (!availability.available) {
      return {
        valid: false,
        reason: 'Conditions not met',
        failedConditions: availability.failedConditions,
      };
    }

    return { valid: true };
  }

  /**
   * Simulate a choice without actually committing it
   * Useful for "what-if" scenarios and AI assistants
   *
   * @param gameState - Current game state
   * @param choiceIndex - Index of the choice
   * @returns Simulated state transition
   */
  async simulateChoice(
    gameState: GameState,
    choiceIndex: number,
  ): Promise<StateTransition> {
    // This doesn't modify the actual game state or save to DB
    // It just shows what would happen
    return this.makeChoice(gameState, choiceIndex);
  }
}
