/**
 * Game State Interface
 * Represents the complete state of a player's game session
 */

export interface GameState {
  // Player identification
  userId: string;
  storyId: string;
  saveId: string;

  // Story progress
  currentNodeId: string;
  visitedNodes: string[];
  choicesHistory: ChoiceRecord[];

  // Player stats
  stats: {
    knowledge: number;
    dexterity: number;
    charisma: number;
    strength: number;
    luck: number;
    [key: string]: number; // Allow custom stats
  };

  // Wallets (currencies)
  wallets: {
    [currency: string]: number;
  };

  // Inventory
  inventory: {
    [itemKey: string]: number; // itemKey -> quantity
  };

  // Flags for story branching
  flags: {
    [key: string]: any; // Flexible storage for story state
  };

  // Active status effects
  statusEffects: StatusEffect[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  seed?: string; // Optional seed for deterministic randomness
}

export interface ChoiceRecord {
  nodeId: string;
  choiceIndex: number;
  choiceText: string;
  timestamp: Date;
}

export interface StatusEffect {
  type: string;
  value: number;
  duration?: number; // Turns remaining, undefined = permanent
  source?: string; // What caused this effect
}

/**
 * Effect Interface
 * Defines actions that modify game state
 */
export interface Effect {
  type: 'wallet' | 'inventory' | 'stat' | 'flag' | 'status_effect';
  target: string; // currency/item/stat/flag name
  operation: 'add' | 'subtract' | 'set' | 'multiply';
  value: number | string | boolean;
  metadata?: {
    reason?: string;
    source?: string;
    [key: string]: any;
  };
}

/**
 * Condition Interface
 * Uses JSONLogic format for complex conditions
 */
export interface Condition {
  logic: any; // JSONLogic expression
}

/**
 * Choice Interface
 * Represents a player choice option
 */
export interface Choice {
  id: string;
  text: string;
  targetNodeId: string;
  conditions?: Condition[];
  effects?: Effect[];
  rollRequirements?: RollRequirement[];
}

/**
 * Roll Requirement Interface
 * Defines a dice roll check requirement
 */
export interface RollRequirement {
  stat: string; // e.g., 'dexterity', 'knowledge'
  difficulty: number; // DC to beat
  formula?: string; // e.g., '1d20+modifier' - if not provided, uses default
}

/**
 * Roll Result Interface
 * Result of a dice roll
 */
export interface RollResult {
  total: number;
  rolls: number[];
  modifier: number;
  formula: string;
  success?: boolean; // If comparing to DC
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
}

/**
 * State Transition Interface
 * Result of moving to a new node
 */
export interface StateTransition {
  previousNodeId: string;
  newNodeId: string;
  appliedEffects: Effect[];
  updatedState: GameState;
  rollResults?: RollResult[];
}
