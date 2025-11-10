import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Effect, GameState, StatusEffect } from './interfaces/game-state.interface';

/**
 * EffectProcessor Service
 *
 * Applies effects to game state (wallets, inventory, stats, flags, status effects).
 * Ensures state consistency and prevents invalid operations.
 *
 * Effect Types:
 * - wallet: Modify currency balances
 * - inventory: Add/remove items
 * - stat: Modify player stats
 * - flag: Set story flags
 * - status_effect: Add/remove status effects
 */
@Injectable()
export class EffectProcessorService {
  private readonly logger = new Logger(EffectProcessorService.name);

  /**
   * Apply a single effect to game state
   * Mutates the gameState object in place
   *
   * @param effect - The effect to apply
   * @param gameState - Current game state (will be modified)
   * @returns true if effect was applied successfully
   */
  applyEffect(effect: Effect, gameState: GameState): boolean {
    try {
      switch (effect.type) {
        case 'wallet':
          this.applyWalletEffect(effect, gameState);
          break;
        case 'inventory':
          this.applyInventoryEffect(effect, gameState);
          break;
        case 'stat':
          this.applyStatEffect(effect, gameState);
          break;
        case 'flag':
          this.applyFlagEffect(effect, gameState);
          break;
        case 'status_effect':
          this.applyStatusEffect(effect, gameState);
          break;
        default:
          this.logger.warn(`Unknown effect type: ${effect.type}`);
          return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error applying effect: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Apply multiple effects to game state
   *
   * @param effects - Array of effects to apply
   * @param gameState - Current game state (will be modified)
   * @returns Array of successfully applied effects
   */
  applyEffects(effects: Effect[], gameState: GameState): Effect[] {
    if (!effects || effects.length === 0) {
      return [];
    }

    const appliedEffects: Effect[] = [];

    for (const effect of effects) {
      if (this.applyEffect(effect, gameState)) {
        appliedEffects.push(effect);
      }
    }

    // Update timestamp
    gameState.updatedAt = new Date();

    return appliedEffects;
  }

  /**
   * Apply wallet effect (modify currency)
   */
  private applyWalletEffect(effect: Effect, gameState: GameState): void {
    const currency = effect.target;
    const value = Number(effect.value);

    if (isNaN(value)) {
      throw new BadRequestException(
        `Invalid wallet value: ${effect.value}`,
      );
    }

    // Initialize currency if doesn't exist
    if (gameState.wallets[currency] === undefined) {
      gameState.wallets[currency] = 0;
    }

    const currentBalance = gameState.wallets[currency];

    switch (effect.operation) {
      case 'add':
        gameState.wallets[currency] = currentBalance + value;
        break;
      case 'subtract':
        gameState.wallets[currency] = Math.max(0, currentBalance - value);
        break;
      case 'set':
        gameState.wallets[currency] = Math.max(0, value);
        break;
      case 'multiply':
        gameState.wallets[currency] = Math.max(0, currentBalance * value);
        break;
    }

    this.logger.debug(
      `Wallet effect: ${currency} ${currentBalance} → ${gameState.wallets[currency]}`,
    );
  }

  /**
   * Apply inventory effect (add/remove items)
   */
  private applyInventoryEffect(effect: Effect, gameState: GameState): void {
    const itemKey = effect.target;
    const value = Number(effect.value);

    if (isNaN(value)) {
      throw new BadRequestException(
        `Invalid inventory value: ${effect.value}`,
      );
    }

    // Initialize item if doesn't exist
    if (gameState.inventory[itemKey] === undefined) {
      gameState.inventory[itemKey] = 0;
    }

    const currentQuantity = gameState.inventory[itemKey];

    switch (effect.operation) {
      case 'add':
        gameState.inventory[itemKey] = currentQuantity + value;
        break;
      case 'subtract':
        gameState.inventory[itemKey] = Math.max(0, currentQuantity - value);
        // Remove item if quantity reaches 0
        if (gameState.inventory[itemKey] === 0) {
          delete gameState.inventory[itemKey];
        }
        break;
      case 'set':
        gameState.inventory[itemKey] = Math.max(0, value);
        if (gameState.inventory[itemKey] === 0) {
          delete gameState.inventory[itemKey];
        }
        break;
      case 'multiply':
        gameState.inventory[itemKey] = Math.max(0, currentQuantity * value);
        break;
    }

    this.logger.debug(
      `Inventory effect: ${itemKey} ${currentQuantity} → ${gameState.inventory[itemKey] || 0}`,
    );
  }

  /**
   * Apply stat effect (modify player stats)
   */
  private applyStatEffect(effect: Effect, gameState: GameState): void {
    const statName = effect.target;
    const value = Number(effect.value);

    if (isNaN(value)) {
      throw new BadRequestException(
        `Invalid stat value: ${effect.value}`,
      );
    }

    // Initialize stat if doesn't exist
    if (gameState.stats[statName] === undefined) {
      gameState.stats[statName] = 10; // Default D&D stat value
    }

    const currentValue = gameState.stats[statName];

    switch (effect.operation) {
      case 'add':
        gameState.stats[statName] = currentValue + value;
        break;
      case 'subtract':
        gameState.stats[statName] = Math.max(1, currentValue - value); // Stats min 1
        break;
      case 'set':
        gameState.stats[statName] = Math.max(1, value);
        break;
      case 'multiply':
        gameState.stats[statName] = Math.max(1, currentValue * value);
        break;
    }

    this.logger.debug(
      `Stat effect: ${statName} ${currentValue} → ${gameState.stats[statName]}`,
    );
  }

  /**
   * Apply flag effect (set story flags)
   */
  private applyFlagEffect(effect: Effect, gameState: GameState): void {
    const flagName = effect.target;
    let value = effect.value;

    // For flags, 'set' operation is most common
    // 'add'/'subtract' work for numeric flags
    switch (effect.operation) {
      case 'set':
        gameState.flags[flagName] = value;
        break;
      case 'add':
        if (typeof value === 'number') {
          const current = Number(gameState.flags[flagName]) || 0;
          gameState.flags[flagName] = current + value;
        } else {
          throw new BadRequestException(
            `Cannot add non-numeric value to flag: ${flagName}`,
          );
        }
        break;
      case 'subtract':
        if (typeof value === 'number') {
          const current = Number(gameState.flags[flagName]) || 0;
          gameState.flags[flagName] = current - value;
        } else {
          throw new BadRequestException(
            `Cannot subtract non-numeric value from flag: ${flagName}`,
          );
        }
        break;
      case 'multiply':
        if (typeof value === 'number') {
          const current = Number(gameState.flags[flagName]) || 0;
          gameState.flags[flagName] = current * value;
        } else {
          throw new BadRequestException(
            `Cannot multiply non-numeric flag: ${flagName}`,
          );
        }
        break;
    }

    this.logger.debug(`Flag effect: ${flagName} → ${gameState.flags[flagName]}`);
  }

  /**
   * Apply status effect (add/remove status effects)
   */
  private applyStatusEffect(effect: Effect, gameState: GameState): void {
    const effectType = effect.target;
    const value = Number(effect.value);

    switch (effect.operation) {
      case 'add':
        // Add or update status effect
        const existingIndex = gameState.statusEffects.findIndex(
          (e) => e.type === effectType,
        );

        const newEffect: StatusEffect = {
          type: effectType,
          value,
          duration: effect.metadata?.duration,
          source: effect.metadata?.source,
        };

        if (existingIndex >= 0) {
          // Update existing effect
          gameState.statusEffects[existingIndex] = newEffect;
        } else {
          // Add new effect
          gameState.statusEffects.push(newEffect);
        }

        this.logger.debug(`Status effect added: ${effectType} (value: ${value})`);
        break;

      case 'subtract':
        // Remove status effect
        gameState.statusEffects = gameState.statusEffects.filter(
          (e) => e.type !== effectType,
        );
        this.logger.debug(`Status effect removed: ${effectType}`);
        break;

      case 'set':
        // Set or overwrite status effect
        const setIndex = gameState.statusEffects.findIndex(
          (e) => e.type === effectType,
        );

        const setEffect: StatusEffect = {
          type: effectType,
          value,
          duration: effect.metadata?.duration,
          source: effect.metadata?.source,
        };

        if (setIndex >= 0) {
          gameState.statusEffects[setIndex] = setEffect;
        } else {
          gameState.statusEffects.push(setEffect);
        }

        this.logger.debug(`Status effect set: ${effectType} (value: ${value})`);
        break;

      default:
        throw new BadRequestException(
          `Invalid operation for status effect: ${effect.operation}`,
        );
    }
  }

  /**
   * Process status effect durations (call after each turn/node transition)
   * Decrements duration and removes expired effects
   */
  processStatusEffectDurations(gameState: GameState): void {
    gameState.statusEffects = gameState.statusEffects
      .map((effect) => {
        if (effect.duration !== undefined && effect.duration > 0) {
          return { ...effect, duration: effect.duration - 1 };
        }
        return effect;
      })
      .filter((effect) => effect.duration === undefined || effect.duration > 0);
  }
}
