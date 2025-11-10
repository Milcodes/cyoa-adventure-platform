import { Test, TestingModule } from '@nestjs/testing';
import { EffectProcessorService } from './effect-processor.service';
import { GameState, Effect } from './interfaces/game-state.interface';

describe('EffectProcessorService', () => {
  let service: EffectProcessorService;
  let gameState: GameState;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EffectProcessorService],
    }).compile();

    service = module.get<EffectProcessorService>(EffectProcessorService);

    // Create a fresh game state for each test
    gameState = {
      userId: 'user-1',
      storyId: 'story-1',
      saveId: 'save-1',
      currentNodeId: 'node-1',
      visitedNodes: ['node-1'],
      choicesHistory: [],
      stats: {
        knowledge: 10,
        dexterity: 10,
        charisma: 10,
        strength: 10,
        luck: 10,
      },
      wallets: {
        gold: 100,
      },
      inventory: {
        sword: 1,
        potion: 3,
      },
      flags: {
        met_wizard: true,
        quest_count: 0,
      },
      statusEffects: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('wallet effects', () => {
    it('should add currency', () => {
      const effect: Effect = {
        type: 'wallet',
        target: 'gold',
        operation: 'add',
        value: 50,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.wallets.gold).toBe(150);
    });

    it('should subtract currency', () => {
      const effect: Effect = {
        type: 'wallet',
        target: 'gold',
        operation: 'subtract',
        value: 30,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.wallets.gold).toBe(70);
    });

    it('should not go below zero', () => {
      const effect: Effect = {
        type: 'wallet',
        target: 'gold',
        operation: 'subtract',
        value: 200,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.wallets.gold).toBe(0);
    });

    it('should set currency', () => {
      const effect: Effect = {
        type: 'wallet',
        target: 'gold',
        operation: 'set',
        value: 500,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.wallets.gold).toBe(500);
    });

    it('should multiply currency', () => {
      const effect: Effect = {
        type: 'wallet',
        target: 'gold',
        operation: 'multiply',
        value: 2,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.wallets.gold).toBe(200);
    });

    it('should create new currency if not exists', () => {
      const effect: Effect = {
        type: 'wallet',
        target: 'gems',
        operation: 'add',
        value: 10,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.wallets.gems).toBe(10);
    });
  });

  describe('inventory effects', () => {
    it('should add items', () => {
      const effect: Effect = {
        type: 'inventory',
        target: 'potion',
        operation: 'add',
        value: 2,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.inventory.potion).toBe(5);
    });

    it('should subtract items', () => {
      const effect: Effect = {
        type: 'inventory',
        target: 'potion',
        operation: 'subtract',
        value: 2,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.inventory.potion).toBe(1);
    });

    it('should remove item when quantity reaches zero', () => {
      const effect: Effect = {
        type: 'inventory',
        target: 'sword',
        operation: 'subtract',
        value: 1,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.inventory.sword).toBeUndefined();
    });

    it('should not go below zero', () => {
      const effect: Effect = {
        type: 'inventory',
        target: 'potion',
        operation: 'subtract',
        value: 10,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.inventory.potion).toBeUndefined();
    });

    it('should set item quantity', () => {
      const effect: Effect = {
        type: 'inventory',
        target: 'potion',
        operation: 'set',
        value: 10,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.inventory.potion).toBe(10);
    });

    it('should create new item if not exists', () => {
      const effect: Effect = {
        type: 'inventory',
        target: 'shield',
        operation: 'add',
        value: 1,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.inventory.shield).toBe(1);
    });
  });

  describe('stat effects', () => {
    it('should add to stat', () => {
      const effect: Effect = {
        type: 'stat',
        target: 'strength',
        operation: 'add',
        value: 3,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.stats.strength).toBe(13);
    });

    it('should subtract from stat', () => {
      const effect: Effect = {
        type: 'stat',
        target: 'dexterity',
        operation: 'subtract',
        value: 2,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.stats.dexterity).toBe(8);
    });

    it('should not go below 1', () => {
      const effect: Effect = {
        type: 'stat',
        target: 'strength',
        operation: 'subtract',
        value: 20,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.stats.strength).toBe(1);
    });

    it('should set stat', () => {
      const effect: Effect = {
        type: 'stat',
        target: 'charisma',
        operation: 'set',
        value: 16,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.stats.charisma).toBe(16);
    });

    it('should multiply stat', () => {
      const effect: Effect = {
        type: 'stat',
        target: 'luck',
        operation: 'multiply',
        value: 1.5,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.stats.luck).toBe(15);
    });
  });

  describe('flag effects', () => {
    it('should set boolean flag', () => {
      const effect: Effect = {
        type: 'flag',
        target: 'found_treasure',
        operation: 'set',
        value: true,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.flags.found_treasure).toBe(true);
    });

    it('should set string flag', () => {
      const effect: Effect = {
        type: 'flag',
        target: 'player_choice',
        operation: 'set',
        value: 'helped_villagers',
      };

      service.applyEffect(effect, gameState);

      expect(gameState.flags.player_choice).toBe('helped_villagers');
    });

    it('should add to numeric flag', () => {
      const effect: Effect = {
        type: 'flag',
        target: 'quest_count',
        operation: 'add',
        value: 1,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.flags.quest_count).toBe(1);
    });

    it('should subtract from numeric flag', () => {
      gameState.flags.quest_count = 5;

      const effect: Effect = {
        type: 'flag',
        target: 'quest_count',
        operation: 'subtract',
        value: 2,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.flags.quest_count).toBe(3);
    });
  });

  describe('status effect operations', () => {
    it('should add status effect', () => {
      const effect: Effect = {
        type: 'status_effect',
        target: 'poisoned',
        operation: 'add',
        value: 5,
        metadata: {
          duration: 3,
          source: 'snake_bite',
        },
      };

      service.applyEffect(effect, gameState);

      expect(gameState.statusEffects).toHaveLength(1);
      expect(gameState.statusEffects[0]).toEqual({
        type: 'poisoned',
        value: 5,
        duration: 3,
        source: 'snake_bite',
      });
    });

    it('should update existing status effect', () => {
      gameState.statusEffects = [
        { type: 'poisoned', value: 3, duration: 2 },
      ];

      const effect: Effect = {
        type: 'status_effect',
        target: 'poisoned',
        operation: 'add',
        value: 7,
        metadata: {
          duration: 5,
        },
      };

      service.applyEffect(effect, gameState);

      expect(gameState.statusEffects).toHaveLength(1);
      expect(gameState.statusEffects[0].value).toBe(7);
      expect(gameState.statusEffects[0].duration).toBe(5);
    });

    it('should remove status effect', () => {
      gameState.statusEffects = [
        { type: 'poisoned', value: 5 },
        { type: 'blessed', value: 10 },
      ];

      const effect: Effect = {
        type: 'status_effect',
        target: 'poisoned',
        operation: 'subtract',
        value: 0,
      };

      service.applyEffect(effect, gameState);

      expect(gameState.statusEffects).toHaveLength(1);
      expect(gameState.statusEffects[0].type).toBe('blessed');
    });
  });

  describe('applyEffects', () => {
    it('should apply multiple effects', () => {
      const effects: Effect[] = [
        { type: 'wallet', target: 'gold', operation: 'add', value: 50 },
        { type: 'inventory', target: 'potion', operation: 'add', value: 2 },
        { type: 'stat', target: 'strength', operation: 'add', value: 1 },
      ];

      const appliedEffects = service.applyEffects(effects, gameState);

      expect(appliedEffects).toHaveLength(3);
      expect(gameState.wallets.gold).toBe(150);
      expect(gameState.inventory.potion).toBe(5);
      expect(gameState.stats.strength).toBe(11);
    });

    it('should update timestamp', () => {
      const oldTimestamp = gameState.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {
        const effects: Effect[] = [
          { type: 'wallet', target: 'gold', operation: 'add', value: 10 },
        ];

        service.applyEffects(effects, gameState);

        expect(gameState.updatedAt.getTime()).toBeGreaterThanOrEqual(
          oldTimestamp.getTime(),
        );
      }, 10);
    });
  });

  describe('processStatusEffectDurations', () => {
    it('should decrement durations', () => {
      gameState.statusEffects = [
        { type: 'poisoned', value: 5, duration: 3 },
        { type: 'blessed', value: 10, duration: 2 },
      ];

      service.processStatusEffectDurations(gameState);

      expect(gameState.statusEffects[0].duration).toBe(2);
      expect(gameState.statusEffects[1].duration).toBe(1);
    });

    it('should remove expired effects', () => {
      gameState.statusEffects = [
        { type: 'poisoned', value: 5, duration: 1 },
        { type: 'blessed', value: 10, duration: 2 },
      ];

      service.processStatusEffectDurations(gameState);

      expect(gameState.statusEffects).toHaveLength(1);
      expect(gameState.statusEffects[0].type).toBe('blessed');
    });

    it('should keep permanent effects (undefined duration)', () => {
      gameState.statusEffects = [
        { type: 'cursed', value: -5 },
        { type: 'poisoned', value: 5, duration: 1 },
      ];

      service.processStatusEffectDurations(gameState);

      expect(gameState.statusEffects).toHaveLength(1);
      expect(gameState.statusEffects[0].type).toBe('cursed');
    });
  });
});
