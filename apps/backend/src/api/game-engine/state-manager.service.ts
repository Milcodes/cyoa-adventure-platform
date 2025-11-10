import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GameState, ChoiceRecord } from './interfaces/game-state.interface';

/**
 * StateManager Service
 *
 * Manages game state lifecycle:
 * - Creation of new game states
 * - Validation of state integrity
 * - Deep cloning for safe mutations
 * - State snapshots for save/restore
 */
@Injectable()
export class StateManagerService {
  private readonly logger = new Logger(StateManagerService.name);

  /**
   * Create a new game state for a player starting a story
   *
   * @param userId - Player's user ID
   * @param storyId - Story ID to start
   * @param startNodeId - Starting node ID
   * @param saveId - Save slot ID
   * @param seed - Optional seed for deterministic randomness
   * @returns New GameState object
   */
  createNewState(
    userId: string,
    storyId: string,
    startNodeId: string,
    saveId: string,
    seed?: string,
  ): GameState {
    const now = new Date();

    const state: GameState = {
      userId,
      storyId,
      saveId,
      currentNodeId: startNodeId,
      visitedNodes: [startNodeId],
      choicesHistory: [],
      stats: {
        knowledge: 10,
        dexterity: 10,
        charisma: 10,
        strength: 10,
        luck: 10,
      },
      wallets: {},
      inventory: {},
      flags: {},
      statusEffects: [],
      createdAt: now,
      updatedAt: now,
      seed,
    };

    this.logger.log(
      `Created new game state: ${storyId} for user ${userId} (save: ${saveId})`,
    );

    return state;
  }

  /**
   * Create game state with custom initial stats
   *
   * @param userId - Player's user ID
   * @param storyId - Story ID
   * @param startNodeId - Starting node ID
   * @param saveId - Save slot ID
   * @param initialStats - Custom starting stats
   * @param seed - Optional seed
   * @returns New GameState object
   */
  createStateWithStats(
    userId: string,
    storyId: string,
    startNodeId: string,
    saveId: string,
    initialStats: Record<string, number>,
    seed?: string,
  ): GameState {
    const state = this.createNewState(
      userId,
      storyId,
      startNodeId,
      saveId,
      seed,
    );

    // Override default stats with provided values
    state.stats = { ...state.stats, ...initialStats };

    return state;
  }

  /**
   * Validate game state integrity
   * Checks for required fields and valid data types
   *
   * @param state - Game state to validate
   * @throws BadRequestException if state is invalid
   */
  validateState(state: GameState): void {
    // Required string fields
    const requiredFields = [
      'userId',
      'storyId',
      'saveId',
      'currentNodeId',
    ] as const;

    for (const field of requiredFields) {
      if (!state[field] || typeof state[field] !== 'string') {
        throw new BadRequestException(`Missing or invalid field: ${field}`);
      }
    }

    // Required arrays
    if (!Array.isArray(state.visitedNodes)) {
      throw new BadRequestException('visitedNodes must be an array');
    }

    if (!Array.isArray(state.choicesHistory)) {
      throw new BadRequestException('choicesHistory must be an array');
    }

    if (!Array.isArray(state.statusEffects)) {
      throw new BadRequestException('statusEffects must be an array');
    }

    // Required objects
    if (!state.stats || typeof state.stats !== 'object') {
      throw new BadRequestException('stats must be an object');
    }

    if (!state.wallets || typeof state.wallets !== 'object') {
      throw new BadRequestException('wallets must be an object');
    }

    if (!state.inventory || typeof state.inventory !== 'object') {
      throw new BadRequestException('inventory must be an object');
    }

    if (!state.flags || typeof state.flags !== 'object') {
      throw new BadRequestException('flags must be an object');
    }

    // Validate stats are numbers
    for (const [statName, value] of Object.entries(state.stats)) {
      if (typeof value !== 'number' || value < 1) {
        throw new BadRequestException(
          `Invalid stat value for ${statName}: ${value}`,
        );
      }
    }

    // Validate wallet balances are non-negative
    for (const [currency, balance] of Object.entries(state.wallets)) {
      if (typeof balance !== 'number' || balance < 0) {
        throw new BadRequestException(
          `Invalid wallet balance for ${currency}: ${balance}`,
        );
      }
    }

    // Validate inventory quantities are non-negative
    for (const [item, quantity] of Object.entries(state.inventory)) {
      if (typeof quantity !== 'number' || quantity < 0) {
        throw new BadRequestException(
          `Invalid inventory quantity for ${item}: ${quantity}`,
        );
      }
    }

    // Validate dates
    if (!(state.createdAt instanceof Date) || isNaN(state.createdAt.getTime())) {
      throw new BadRequestException('Invalid createdAt date');
    }

    if (!(state.updatedAt instanceof Date) || isNaN(state.updatedAt.getTime())) {
      throw new BadRequestException('Invalid updatedAt date');
    }

    this.logger.debug('State validation passed');
  }

  /**
   * Deep clone a game state for safe mutations
   * Creates a completely independent copy
   *
   * @param state - State to clone
   * @returns Deep copy of the state
   */
  cloneState(state: GameState): GameState {
    return {
      userId: state.userId,
      storyId: state.storyId,
      saveId: state.saveId,
      currentNodeId: state.currentNodeId,
      visitedNodes: [...state.visitedNodes],
      choicesHistory: state.choicesHistory.map((choice) => ({ ...choice })),
      stats: { ...state.stats },
      wallets: { ...state.wallets },
      inventory: { ...state.inventory },
      flags: JSON.parse(JSON.stringify(state.flags)), // Deep clone for nested objects
      statusEffects: state.statusEffects.map((effect) => ({ ...effect })),
      createdAt: new Date(state.createdAt),
      updatedAt: new Date(state.updatedAt),
      seed: state.seed,
    };
  }

  /**
   * Record a choice in the game state history
   *
   * @param state - Game state to update
   * @param nodeId - Node where choice was made
   * @param choiceIndex - Index of the chosen option
   * @param choiceText - Text of the chosen option
   */
  recordChoice(
    state: GameState,
    nodeId: string,
    choiceIndex: number,
    choiceText: string,
  ): void {
    const record: ChoiceRecord = {
      nodeId,
      choiceIndex,
      choiceText,
      timestamp: new Date(),
    };

    state.choicesHistory.push(record);
    state.updatedAt = new Date();

    this.logger.debug(
      `Recorded choice: node=${nodeId}, choice=${choiceIndex}`,
    );
  }

  /**
   * Update current node and record visit
   *
   * @param state - Game state to update
   * @param newNodeId - ID of the new node
   */
  moveToNode(state: GameState, newNodeId: string): void {
    state.currentNodeId = newNodeId;

    // Add to visited nodes if not already visited
    if (!state.visitedNodes.includes(newNodeId)) {
      state.visitedNodes.push(newNodeId);
    }

    state.updatedAt = new Date();

    this.logger.debug(`Moved to node: ${newNodeId}`);
  }

  /**
   * Check if a node has been visited
   *
   * @param state - Game state
   * @param nodeId - Node ID to check
   * @returns true if visited
   */
  hasVisitedNode(state: GameState, nodeId: string): boolean {
    return state.visitedNodes.includes(nodeId);
  }

  /**
   * Get the number of choices made
   *
   * @param state - Game state
   * @returns Number of choices in history
   */
  getChoiceCount(state: GameState): number {
    return state.choicesHistory.length;
  }

  /**
   * Create a snapshot of state for saving to database
   * Serializes to JSON-compatible format
   *
   * @param state - Game state
   * @returns Plain object suitable for JSON serialization
   */
  createSnapshot(state: GameState): any {
    return {
      userId: state.userId,
      storyId: state.storyId,
      saveId: state.saveId,
      currentNodeId: state.currentNodeId,
      visitedNodes: state.visitedNodes,
      choicesHistory: state.choicesHistory,
      stats: state.stats,
      wallets: state.wallets,
      inventory: state.inventory,
      flags: state.flags,
      statusEffects: state.statusEffects,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      seed: state.seed,
    };
  }

  /**
   * Restore state from a snapshot (database load)
   * Converts serialized data back to GameState
   *
   * @param snapshot - Plain object from database
   * @returns GameState object
   */
  restoreFromSnapshot(snapshot: any): GameState {
    const state: GameState = {
      userId: snapshot.userId,
      storyId: snapshot.storyId,
      saveId: snapshot.saveId,
      currentNodeId: snapshot.currentNodeId,
      visitedNodes: snapshot.visitedNodes || [],
      choicesHistory: snapshot.choicesHistory || [],
      stats: snapshot.stats || {},
      wallets: snapshot.wallets || {},
      inventory: snapshot.inventory || {},
      flags: snapshot.flags || {},
      statusEffects: snapshot.statusEffects || [],
      createdAt: new Date(snapshot.createdAt),
      updatedAt: new Date(snapshot.updatedAt),
      seed: snapshot.seed,
    };

    // Validate restored state
    this.validateState(state);

    return state;
  }

  /**
   * Merge two game states (useful for multiplayer or state reconciliation)
   * Prioritizes the 'primary' state for conflicts
   *
   * @param primary - Primary state (takes precedence)
   * @param secondary - Secondary state
   * @returns Merged state
   */
  mergeStates(primary: GameState, secondary: GameState): GameState {
    if (primary.userId !== secondary.userId || primary.storyId !== secondary.storyId) {
      throw new BadRequestException(
        'Cannot merge states from different users or stories',
      );
    }

    const merged = this.cloneState(primary);

    // Merge visited nodes (union)
    const allVisitedNodes = new Set([
      ...primary.visitedNodes,
      ...secondary.visitedNodes,
    ]);
    merged.visitedNodes = Array.from(allVisitedNodes);

    // Use latest timestamp
    if (secondary.updatedAt > primary.updatedAt) {
      merged.updatedAt = secondary.updatedAt;
    }

    return merged;
  }
}
