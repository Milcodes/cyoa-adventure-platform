import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StateManagerService } from '../game-engine/state-manager.service';
import { StoryNavigatorService } from '../game-engine/story-navigator.service';
import { GameState, StateTransition } from '../game-engine/interfaces/game-state.interface';
import { StartGameDto } from './dto/start-game.dto';
import { MakeChoiceDto } from './dto/make-choice.dto';

/**
 * GameplayService
 *
 * Handles gameplay operations:
 * - Starting new games
 * - Loading/saving game states
 * - Processing player choices
 * - Retrieving game content
 */
@Injectable()
export class GameplayService {
  private readonly logger = new Logger(GameplayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateManager: StateManagerService,
    private readonly storyNavigator: StoryNavigatorService,
  ) {}

  /**
   * Start a new game
   *
   * @param userId - Player's user ID
   * @param startGameDto - Start game parameters
   * @returns New game state and initial node content
   */
  async startGame(userId: string, startGameDto: StartGameDto) {
    const { storyId, saveSlot = 0, customStats, seed } = startGameDto;

    // Verify story exists and is published
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        nodes: {
          where: { key: 'start' },
          take: 1,
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.status !== 'published') {
      throw new BadRequestException('Story is not published');
    }

    // Find start node
    const startNode = story.nodes[0];
    if (!startNode) {
      throw new BadRequestException('Story has no start node');
    }

    // Check if save already exists
    const existingSave = await this.prisma.save.findFirst({
      where: {
        user_id: userId,
        story_id: storyId,
        slot: saveSlot,
      },
    });

    if (existingSave) {
      throw new BadRequestException(
        `Save slot ${saveSlot} already exists. Load or delete it first.`,
      );
    }

    // Create game state
    const gameState = customStats
      ? this.stateManager.createStateWithStats(
          userId,
          storyId,
          startNode.id,
          `slot-${saveSlot}`,
          customStats,
          seed,
        )
      : this.stateManager.createNewState(
          userId,
          storyId,
          startNode.id,
          `slot-${saveSlot}`,
          seed,
        );

    // Save to database
    const snapshot = this.stateManager.createSnapshot(gameState);
    const save = await this.prisma.save.create({
      data: {
        user_id: userId,
        story_id: storyId,
        slot: saveSlot,
        node_key: startNode.key,
        snapshot_json: snapshot,
      },
    });

    this.logger.log(
      `New game started: user=${userId}, story=${storyId}, save=${save.id}`,
    );

    // Get initial node content
    const nodeContent = await this.storyNavigator.getNodeContent(startNode.id);
    const availableChoices = await this.storyNavigator.getAvailableChoices(gameState);

    return {
      saveId: save.id,
      gameState: this.sanitizeGameState(gameState),
      currentNode: nodeContent,
      availableChoices,
    };
  }

  /**
   * Load game state from save
   *
   * @param userId - Player's user ID
   * @param saveId - Save ID
   * @param locale - Locale for translations
   * @returns Game state and current node content
   */
  async loadGame(userId: string, saveId: string, locale: string = 'hu') {
    const save = await this.prisma.save.findUnique({
      where: { id: saveId },
      include: {
        story: true,
      },
    });

    if (!save) {
      throw new NotFoundException('Save not found');
    }

    // Check ownership
    if (save.user_id !== userId) {
      throw new ForbiddenException('You do not own this save');
    }

    // Restore game state from snapshot
    const gameState = this.stateManager.restoreFromSnapshot(save.snapshot_json);

    // Get current node content
    const nodeContent = await this.storyNavigator.getNodeContent(
      gameState.currentNodeId,
      locale,
    );

    const availableChoices = await this.storyNavigator.getAvailableChoices(
      gameState,
      locale,
    );

    return {
      saveId: save.id,
      gameState: this.sanitizeGameState(gameState),
      currentNode: nodeContent,
      availableChoices,
      story: {
        id: save.story.id,
        title: save.story.title,
        created_by: save.story.created_by,
      },
    };
  }

  /**
   * Make a choice and advance the game
   *
   * @param userId - Player's user ID
   * @param makeChoiceDto - Choice parameters
   * @returns Updated game state and new node content
   */
  async makeChoice(userId: string, makeChoiceDto: MakeChoiceDto) {
    const { saveId, choiceIndex, locale = 'hu' } = makeChoiceDto;

    // Load save
    const save = await this.prisma.save.findUnique({
      where: { id: saveId },
    });

    if (!save) {
      throw new NotFoundException('Save not found');
    }

    if (save.user_id !== userId) {
      throw new ForbiddenException('You do not own this save');
    }

    // Restore game state
    const gameState = this.stateManager.restoreFromSnapshot(save.snapshot_json);

    // Validate choice
    const validation = await this.storyNavigator.validateChoice(
      gameState,
      choiceIndex,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `Choice not available: ${validation.reason}`,
      );
    }

    // Process choice
    const transition: StateTransition = await this.storyNavigator.makeChoice(
      gameState,
      choiceIndex,
      locale,
    );

    // Get new node key
    const newNode = await this.prisma.storyNode.findUnique({
      where: { id: transition.newNodeId },
      select: { key: true },
    });

    if (!newNode) {
      throw new NotFoundException('New node not found');
    }

    // Save updated state
    const snapshot = this.stateManager.createSnapshot(transition.updatedState);
    await this.prisma.save.update({
      where: { id: saveId },
      data: {
        node_key: newNode.key,
        snapshot_json: snapshot,
      },
    });

    this.logger.log(
      `Choice made: save=${saveId}, ${transition.previousNodeId} → ${transition.newNodeId}`,
    );

    // Get new node content
    const nodeContent = await this.storyNavigator.getNodeContent(
      transition.newNodeId,
      locale,
    );

    const availableChoices = await this.storyNavigator.getAvailableChoices(
      transition.updatedState,
      locale,
    );

    // Check if ending reached
    const isEnding = await this.storyNavigator.isAtEnding(transition.updatedState);

    return {
      transition: {
        previousNodeId: transition.previousNodeId,
        newNodeId: transition.newNodeId,
        appliedEffects: transition.appliedEffects,
        rollResults: transition.rollResults,
      },
      gameState: this.sanitizeGameState(transition.updatedState),
      currentNode: nodeContent,
      availableChoices,
      isEnding,
    };
  }

  /**
   * Get node content (for preview or navigation)
   *
   * @param nodeId - Node ID
   * @param locale - Locale for translations
   * @returns Node content with translations
   */
  async getNodeContent(nodeId: string, locale: string = 'hu') {
    return await this.storyNavigator.getNodeContent(nodeId, locale);
  }

  /**
   * Get progress statistics for a save
   *
   * @param userId - Player's user ID
   * @param saveId - Save ID
   * @returns Progress statistics
   */
  async getProgress(userId: string, saveId: string) {
    const save = await this.prisma.save.findUnique({
      where: { id: saveId },
    });

    if (!save) {
      throw new NotFoundException('Save not found');
    }

    if (save.user_id !== userId) {
      throw new ForbiddenException('You do not own this save');
    }

    const gameState = this.stateManager.restoreFromSnapshot(save.snapshot_json);
    const progress = await this.storyNavigator.getProgress(gameState);

    return {
      ...progress,
      saveId: save.id,
      storyId: save.story_id,
      createdAt: save.created_at,
    };
  }

  /**
   * List all saves for a user (optionally filtered by story)
   *
   * @param userId - Player's user ID
   * @param storyId - Optional story ID filter
   * @returns List of saves
   */
  async listSaves(userId: string, storyId?: string) {
    const saves = await this.prisma.save.findMany({
      where: {
        user_id: userId,
        ...(storyId && { story_id: storyId }),
      },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            created_by: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return saves.map((save) => {
      const gameState = this.stateManager.restoreFromSnapshot(save.snapshot_json);

      return {
        id: save.id,
        slot: save.slot,
        story: save.story,
        currentNodeKey: save.node_key,
        choiceCount: this.stateManager.getChoiceCount(gameState),
        createdAt: save.created_at,
      };
    });
  }

  /**
   * Delete a save
   *
   * @param userId - Player's user ID
   * @param saveId - Save ID
   */
  async deleteSave(userId: string, saveId: string) {
    const save = await this.prisma.save.findUnique({
      where: { id: saveId },
    });

    if (!save) {
      throw new NotFoundException('Save not found');
    }

    if (save.user_id !== userId) {
      throw new ForbiddenException('You do not own this save');
    }

    await this.prisma.save.delete({
      where: { id: saveId },
    });

    this.logger.log(`Save deleted: ${saveId}`);

    return { message: 'Save deleted successfully' };
  }

  /**
   * Sanitize game state for client response
   * Removes sensitive internal data
   */
  private sanitizeGameState(gameState: GameState) {
    return {
      currentNodeId: gameState.currentNodeId,
      visitedNodes: gameState.visitedNodes,
      stats: gameState.stats,
      wallets: gameState.wallets,
      inventory: gameState.inventory,
      flags: gameState.flags,
      statusEffects: gameState.statusEffects,
      choiceCount: this.stateManager.getChoiceCount(gameState),
    };
  }
}
