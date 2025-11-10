import { Test, TestingModule } from '@nestjs/testing';
import { DiceRollerService } from './dice-roller.service';

describe('DiceRollerService', () => {
  let service: DiceRollerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiceRollerService],
    }).compile();

    service = module.get<DiceRollerService>(DiceRollerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('roll', () => {
    it('should parse and roll 1d20', () => {
      const result = service.roll('1d20');

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('rolls');
      expect(result).toHaveProperty('modifier');
      expect(result).toHaveProperty('formula');

      expect(result.rolls).toHaveLength(1);
      expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(result.rolls[0]).toBeLessThanOrEqual(20);
      expect(result.modifier).toBe(0);
      expect(result.formula).toBe('1d20');
    });

    it('should parse and roll 2d6+3', () => {
      const result = service.roll('2d6+3');

      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
      expect(result.total).toBe(result.rolls[0] + result.rolls[1] + 3);
    });

    it('should parse and roll 3d10-2', () => {
      const result = service.roll('3d10-2');

      expect(result.rolls).toHaveLength(3);
      expect(result.modifier).toBe(-2);
    });

    it('should detect critical success on natural 20', () => {
      // Set a seed that produces a 20
      service.setSeed('critical-success-test');

      let foundCrit = false;
      // Try multiple times to find a crit
      for (let i = 0; i < 100; i++) {
        service.setSeed(`test-${i}`);
        const result = service.roll('1d20', 15);

        if (result.rolls[0] === 20) {
          expect(result.criticalSuccess).toBe(true);
          expect(result.success).toBe(true);
          foundCrit = true;
          break;
        }
      }

      // We should find at least one crit in 100 rolls
      expect(foundCrit).toBe(true);
    });

    it('should detect critical failure on natural 1', () => {
      let foundCritFail = false;

      // Try multiple times to find a crit fail
      for (let i = 0; i < 100; i++) {
        service.setSeed(`test-${i}`);
        const result = service.roll('1d20', 15);

        if (result.rolls[0] === 1) {
          expect(result.criticalFailure).toBe(true);
          expect(result.success).toBe(false);
          foundCritFail = true;
          break;
        }
      }

      expect(foundCritFail).toBe(true);
    });

    it('should check success against difficulty', () => {
      service.setSeed('test-seed');

      const result = service.roll('1d20+5', 10);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      // With +5 modifier, we should succeed on rolls >= 5
      if (result.rolls[0] >= 5) {
        expect(result.success).toBe(true);
      }
    });

    it('should throw error on invalid formula', () => {
      expect(() => service.roll('invalid')).toThrow('Invalid dice formula');
      expect(() => service.roll('d20')).toThrow('Invalid dice formula');
      expect(() => service.roll('1d')).toThrow('Invalid dice formula');
    });

    it('should throw error on invalid dice parameters', () => {
      expect(() => service.roll('0d20')).toThrow('Invalid dice parameters');
      expect(() => service.roll('1d0')).toThrow('Invalid dice parameters');
      expect(() => service.roll('1d1')).toThrow('Invalid dice parameters');
    });
  });

  describe('rollWithStatModifier', () => {
    it('should calculate correct modifier for stat 16', () => {
      service.setSeed('test-seed');

      const result = service.rollWithStatModifier(16, 15);

      // Stat 16 should give +3 modifier: (16-10)/2 = 3
      expect(result.modifier).toBe(3);
      expect(result.formula).toBe('1d20+3');
    });

    it('should calculate correct modifier for stat 10', () => {
      const result = service.rollWithStatModifier(10, 15);

      // Stat 10 should give +0 modifier: (10-10)/2 = 0
      expect(result.modifier).toBe(0);
      expect(result.formula).toBe('1d20+0');
    });

    it('should calculate correct negative modifier for stat 8', () => {
      const result = service.rollWithStatModifier(8, 15);

      // Stat 8 should give -1 modifier: (8-10)/2 = -1
      expect(result.modifier).toBe(-1);
      expect(result.formula).toBe('1d20-1');
    });
  });

  describe('calculateModifier', () => {
    it('should calculate D&D style modifiers correctly', () => {
      expect(service.calculateModifier(20)).toBe(5);  // (20-10)/2 = 5
      expect(service.calculateModifier(18)).toBe(4);  // (18-10)/2 = 4
      expect(service.calculateModifier(16)).toBe(3);  // (16-10)/2 = 3
      expect(service.calculateModifier(14)).toBe(2);  // (14-10)/2 = 2
      expect(service.calculateModifier(12)).toBe(1);  // (12-10)/2 = 1
      expect(service.calculateModifier(10)).toBe(0);  // (10-10)/2 = 0
      expect(service.calculateModifier(8)).toBe(-1);  // (8-10)/2 = -1
      expect(service.calculateModifier(6)).toBe(-2);  // (6-10)/2 = -2
      expect(service.calculateModifier(4)).toBe(-3);  // (4-10)/2 = -3
    });
  });

  describe('randomInt', () => {
    it('should return integer within range', () => {
      service.setSeed('test-seed');

      for (let i = 0; i < 100; i++) {
        const result = service.randomInt(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('should handle min === max', () => {
      const result = service.randomInt(5, 5);
      expect(result).toBe(5);
    });
  });

  describe('randomElement', () => {
    it('should return element from array', () => {
      service.setSeed('test-seed');

      const array = ['a', 'b', 'c', 'd'];
      const result = service.randomElement(array);

      expect(array).toContain(result);
    });

    it('should throw error on empty array', () => {
      expect(() => service.randomElement([])).toThrow('Cannot select from empty array');
    });
  });

  describe('deterministic with seed', () => {
    it('should produce same results with same seed', () => {
      service.setSeed('deterministic-test');
      const result1 = service.roll('2d20+5');

      service.setSeed('deterministic-test');
      const result2 = service.roll('2d20+5');

      expect(result1.rolls).toEqual(result2.rolls);
      expect(result1.total).toEqual(result2.total);
    });

    it('should produce different results with different seeds', () => {
      service.setSeed('seed-1');
      const result1 = service.roll('2d20+5');

      service.setSeed('seed-2');
      const result2 = service.roll('2d20+5');

      // Very unlikely to be the same
      expect(result1.rolls).not.toEqual(result2.rolls);
    });
  });
});
