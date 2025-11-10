import { Injectable } from '@nestjs/common';
import { RollResult } from './interfaces/game-state.interface';
import seedrandom from 'seedrandom';

/**
 * DiceRoller Service
 *
 * Handles dice rolling with seeded RNG for reproducibility.
 * Supports standard RPG dice notation: XdY+Z
 *
 * Examples:
 * - 1d20+3  -> Roll 1 twenty-sided die and add 3
 * - 2d6     -> Roll 2 six-sided dice
 * - 3d10-2  -> Roll 3 ten-sided dice and subtract 2
 * - 1d20    -> Standard D20 roll
 */
@Injectable()
export class DiceRollerService {
  private rng: () => number;

  constructor() {
    // Initialize with default RNG (can be overridden with setSeed)
    this.rng = seedrandom();
  }

  /**
   * Set the random seed for deterministic rolls
   * Useful for replaying game sessions or debugging
   */
  setSeed(seed: string): void {
    this.rng = seedrandom(seed);
  }

  /**
   * Roll dice based on a formula string
   *
   * @param formula - Dice formula (e.g., "1d20+3", "2d6-1")
   * @param difficulty - Optional DC for success/failure check
   * @returns RollResult with detailed breakdown
   */
  roll(formula: string, difficulty?: number): RollResult {
    const parsed = this.parseFormula(formula);
    const rolls: number[] = [];

    // Roll each die
    for (let i = 0; i < parsed.count; i++) {
      rolls.push(this.rollDie(parsed.sides));
    }

    const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollSum + parsed.modifier;

    const result: RollResult = {
      total,
      rolls,
      modifier: parsed.modifier,
      formula,
    };

    // Check for critical success/failure on d20 rolls
    if (parsed.sides === 20 && parsed.count === 1) {
      if (rolls[0] === 20) {
        result.criticalSuccess = true;
        result.success = true; // Nat 20 always succeeds
      } else if (rolls[0] === 1) {
        result.criticalFailure = true;
        result.success = false; // Nat 1 always fails
      }
    }

    // Check success against difficulty
    if (difficulty !== undefined) {
      // Critical success/failure override normal success checks
      if (result.success === undefined) {
        result.success = total >= difficulty;
      }
    }

    return result;
  }

  /**
   * Roll a standard d20 with stat modifier
   * Uses D&D 5e formula: (STAT - 10) / 2
   *
   * @param statValue - The stat value (e.g., 16 for DEX)
   * @param difficulty - DC to beat
   * @returns RollResult with modifier applied
   */
  rollWithStatModifier(statValue: number, difficulty: number): RollResult {
    const modifier = this.calculateModifier(statValue);
    const formula = modifier >= 0 ? `1d20+${modifier}` : `1d20${modifier}`;
    return this.roll(formula, difficulty);
  }

  /**
   * Calculate D&D style stat modifier
   * Formula: floor((STAT - 10) / 2)
   *
   * Examples:
   * - STAT 16 → +3
   * - STAT 10 → +0
   * - STAT 8  → -1
   *
   * @param statValue - The stat value
   * @returns The modifier
   */
  calculateModifier(statValue: number): number {
    return Math.floor((statValue - 10) / 2);
  }

  /**
   * Roll a single die
   */
  private rollDie(sides: number): number {
    return Math.floor(this.rng() * sides) + 1;
  }

  /**
   * Parse a dice formula string
   *
   * @param formula - String like "1d20+3" or "2d6-1"
   * @returns Parsed components
   */
  private parseFormula(formula: string): {
    count: number;
    sides: number;
    modifier: number;
  } {
    // Remove whitespace
    const cleaned = formula.replace(/\s/g, '');

    // Match pattern: XdY+Z or XdY-Z or XdY
    const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/i);

    if (!match) {
      throw new Error(`Invalid dice formula: ${formula}`);
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    if (count < 1 || sides < 2) {
      throw new Error(`Invalid dice parameters: ${formula}`);
    }

    return { count, sides, modifier };
  }

  /**
   * Get a random integer between min and max (inclusive)
   * Useful for custom random events
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  /**
   * Get a random element from an array
   */
  randomElement<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot select from empty array');
    }
    return array[this.randomInt(0, array.length - 1)];
  }
}
