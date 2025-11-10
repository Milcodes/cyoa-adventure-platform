import { Injectable, Logger } from '@nestjs/common';
import { Condition, GameState } from './interfaces/game-state.interface';
import * as jsonLogic from 'json-logic-js';

/**
 * ConditionEvaluator Service
 *
 * Evaluates conditions using JSONLogic against game state.
 * Used to determine if choices are available, events trigger, etc.
 *
 * JSONLogic Examples:
 * - { ">=": [{ "var": "stats.knowledge" }, 10] }  → Knowledge >= 10
 * - { "and": [
 *     { ">=": [{ "var": "wallets.gold" }, 50] },
 *     { "in": ["castle_key", { "var": "inventory" }] }
 *   ]}  → Has 50+ gold AND has castle_key
 */
@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  constructor() {
    // Add custom operations if needed
    this.registerCustomOperations();
  }

  /**
   * Evaluate a single condition against game state
   *
   * @param condition - The condition to evaluate
   * @param gameState - Current game state
   * @returns true if condition passes, false otherwise
   */
  evaluate(condition: Condition, gameState: GameState): boolean {
    try {
      const data = this.prepareDataContext(gameState);
      const result = jsonLogic.apply(condition.logic, data);

      // Ensure result is boolean
      return !!result;
    } catch (error) {
      this.logger.error(
        `Condition evaluation error: ${error.message}`,
        error.stack,
      );
      return false; // Fail closed - condition doesn't pass on error
    }
  }

  /**
   * Evaluate multiple conditions (ALL must pass)
   *
   * @param conditions - Array of conditions
   * @param gameState - Current game state
   * @returns true if all conditions pass
   */
  evaluateAll(conditions: Condition[], gameState: GameState): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions = always pass
    }

    return conditions.every((condition) =>
      this.evaluate(condition, gameState),
    );
  }

  /**
   * Evaluate multiple conditions (ANY can pass)
   *
   * @param conditions - Array of conditions
   * @param gameState - Current game state
   * @returns true if at least one condition passes
   */
  evaluateAny(conditions: Condition[], gameState: GameState): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.some((condition) => this.evaluate(condition, gameState));
  }

  /**
   * Check if a choice is available based on its conditions
   * Returns detailed info about which conditions failed
   *
   * @param conditions - Conditions to check
   * @param gameState - Current game state
   * @returns Object with availability and details
   */
  checkAvailability(
    conditions: Condition[],
    gameState: GameState,
  ): {
    available: boolean;
    failedConditions: Array<{ index: number; logic: any }>;
  } {
    if (!conditions || conditions.length === 0) {
      return { available: true, failedConditions: [] };
    }

    const failedConditions: Array<{ index: number; logic: any }> = [];

    conditions.forEach((condition, index) => {
      if (!this.evaluate(condition, gameState)) {
        failedConditions.push({
          index,
          logic: condition.logic,
        });
      }
    });

    return {
      available: failedConditions.length === 0,
      failedConditions,
    };
  }

  /**
   * Prepare game state data for JSONLogic evaluation
   * Flattens the state into a structure easy to query
   */
  private prepareDataContext(gameState: GameState): any {
    return {
      // Stats
      stats: gameState.stats,

      // Wallets
      wallets: gameState.wallets,

      // Inventory (as object with item keys)
      inventory: gameState.inventory,

      // Flags
      flags: gameState.flags,

      // Status effects (as array and map)
      statusEffects: gameState.statusEffects,
      hasStatusEffect: this.createStatusEffectMap(gameState.statusEffects),

      // Story progress
      visitedNodes: gameState.visitedNodes,
      hasVisited: this.createVisitedMap(gameState.visitedNodes),
      currentNodeId: gameState.currentNodeId,

      // Metadata
      choiceCount: gameState.choicesHistory.length,
    };
  }

  /**
   * Create a map of visited nodes for easy "has visited" checks
   */
  private createVisitedMap(visitedNodes: string[]): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    visitedNodes.forEach((nodeId) => {
      map[nodeId] = true;
    });
    return map;
  }

  /**
   * Create a map of active status effects for easy "has effect" checks
   */
  private createStatusEffectMap(
    statusEffects: Array<{ type: string; value: number }>,
  ): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    statusEffects.forEach((effect) => {
      map[effect.type] = true;
    });
    return map;
  }

  /**
   * Register custom JSONLogic operations
   * Add domain-specific operations here
   */
  private registerCustomOperations(): void {
    // Custom operation: hasItem
    // Usage: { "hasItem": ["key", "sword"] }
    jsonLogic.add_operation('hasItem', (itemKey: string, data: any) => {
      return data.inventory && data.inventory[itemKey] > 0;
    });

    // Custom operation: hasItems (multiple)
    // Usage: { "hasItems": [["key", "sword", "potion"]] }
    jsonLogic.add_operation('hasItems', (itemKeys: string[], data: any) => {
      if (!data.inventory) return false;
      return itemKeys.every((key) => data.inventory[key] > 0);
    });

    // Custom operation: itemCount
    // Usage: { ">=": [{ "itemCount": "gold_coin" }, 10] }
    jsonLogic.add_operation('itemCount', (itemKey: string, data: any) => {
      return data.inventory?.[itemKey] || 0;
    });

    // Custom operation: hasVisitedNode
    // Usage: { "hasVisitedNode": "castle_entrance" }
    jsonLogic.add_operation('hasVisitedNode', (nodeId: string, data: any) => {
      return data.hasVisited?.[nodeId] || false;
    });

    // Custom operation: hasStatusEffect
    // Usage: { "hasStatusEffect": "poisoned" }
    jsonLogic.add_operation(
      'hasStatusEffect',
      (effectType: string, data: any) => {
        return data.hasStatusEffect?.[effectType] || false;
      },
    );

    // Custom operation: walletBalance
    // Usage: { ">=": [{ "walletBalance": "gold" }, 50] }
    jsonLogic.add_operation('walletBalance', (currency: string, data: any) => {
      return data.wallets?.[currency] || 0;
    });
  }
}
