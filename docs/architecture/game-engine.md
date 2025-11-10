# Játékmotor Architektúra

## Áttekintés

A CYOA játékmotor egy szerveroldali szabály-alapú rendszer, amely:
- **Determinisztikus**: Ugyanazok a bemenetekből mindig ugyanaz az eredmény
- **Autoritatív**: Kliens nem módosíthatja közvetlenül az állapotot
- **Auditálható**: Minden akció loggolva van

## Architektúra Komponensei

```
┌─────────────────────────────────────────────────────────┐
│                    Game Engine Core                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────┐ │
│  │   State        │  │   Condition    │  │   Effect  │ │
│  │   Manager      │  │   Evaluator    │  │ Processor │ │
│  └────────────────┘  └────────────────┘  └───────────┘ │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────┐ │
│  │   RNG Engine   │  │   Dice Roller  │  │   Story   │ │
│  │   (Seedable)   │  │   (XdY+Z)      │  │ Navigator │ │
│  └────────────────┘  └────────────────┘  └───────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 1. State Manager (Állapotkezelő)

### Feladata
- Játékos állapot (GameState) betöltése és mentése
- Állapot snapshoting
- Állapot validáció

### GameState Struktúra

```typescript
interface GameState {
  userId: string;
  storyId: string;
  currentNodeKey: string;

  inventory: InventoryItem[];
  wallet: {
    balance: number;
    currency: string;
  };

  stats: {
    hp: number;
    maxHp: number;
    knowledge: number;
    dexterity: number;
    strength: number;
    luck: number;
  };

  flags: Record<string, boolean>;
  variables: Record<string, any>;

  history: string[]; // node key history

  statusEffects: StatusEffect[];
}

interface StatusEffect {
  key: string;
  type: 'poison' | 'buff' | 'debuff';
  duration: number; // remaining turns/nodes
  effects: Effect[];
}
```

### Példa Implementáció

```typescript
class StateManager {
  async loadState(userId: string, storyId: string): Promise<GameState> {
    // Load from latest save or create new
    const save = await this.saveRepository.findLatest(userId, storyId);

    if (save) {
      return this.deserializeState(save.snapshot_json);
    }

    return this.createInitialState(userId, storyId);
  }

  async saveState(state: GameState, slot: number = 0): Promise<void> {
    const snapshot = this.serializeState(state);

    await this.saveRepository.upsert({
      userId: state.userId,
      storyId: state.storyId,
      slot,
      nodeKey: state.currentNodeKey,
      snapshotJson: snapshot,
    });
  }

  validateState(state: GameState): ValidationResult {
    // Validate HP bounds, inventory, etc.
    const errors: string[] = [];

    if (state.stats.hp > state.stats.maxHp) {
      errors.push('HP exceeds maxHP');
    }

    if (state.wallet.balance < 0) {
      errors.push('Negative balance not allowed');
    }

    return { valid: errors.length === 0, errors };
  }
}
```

## 2. Condition Evaluator (Feltétel Kiértékelő)

### Feladata
- Node/choice feltételek kiértékelése
- JSONLogic vagy egyéni DSL parsing
- Safe evaluation (no code injection)

### Condition Típusok

```typescript
type Condition =
  | { expr: string }                    // JSONLogic expression
  | { type: 'has_item'; key: string }   // Inventory check
  | { type: 'wallet'; op: '>=' | '<=' | '=='; value: number }
  | { type: 'stat'; key: string; op: '>=' | '<=' | '=='; value: number }
  | { type: 'flag'; key: string; value: boolean }
  | { type: 'node_visited'; key: string };
```

### Példa Implementáció

```typescript
import jsonLogic from 'json-logic-js';

class ConditionEvaluator {
  evaluate(condition: Condition, state: GameState): boolean {
    if ('expr' in condition) {
      return this.evaluateJsonLogic(condition.expr, state);
    }

    switch (condition.type) {
      case 'has_item':
        return state.inventory.some(item => item.key === condition.key);

      case 'wallet':
        return this.compareNumbers(
          state.wallet.balance,
          condition.op,
          condition.value
        );

      case 'stat':
        const statValue = state.stats[condition.key];
        return this.compareNumbers(statValue, condition.op, condition.value);

      case 'flag':
        return state.flags[condition.key] === condition.value;

      case 'node_visited':
        return state.history.includes(condition.key);

      default:
        throw new Error(`Unknown condition type: ${condition}`);
    }
  }

  evaluateJsonLogic(expr: string, state: GameState): boolean {
    const logic = JSON.parse(expr);
    const context = this.buildContext(state);
    return jsonLogic.apply(logic, context);
  }

  buildContext(state: GameState) {
    return {
      wallet: state.wallet,
      stats: state.stats,
      flags: state.flags,
      vars: state.variables,
      has: (key: string) => state.inventory.some(i => i.key === key),
    };
  }

  private compareNumbers(a: number, op: string, b: number): boolean {
    switch (op) {
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '==': return a === b;
      case '>': return a > b;
      case '<': return a < b;
      default: return false;
    }
  }
}
```

### JSONLogic Példák

```json
// Pénz >= 5 ÉS van fáklyád
{
  "and": [
    { ">=": [{ "var": "wallet.balance" }, 5] },
    { "var": "has('torch')" }
  ]
}

// Tudás > 10 VAGY Ügyesség > 15
{
  "or": [
    { ">": [{ "var": "stats.knowledge" }, 10] },
    { ">": [{ "var": "stats.dexterity" }, 15] }
  ]
}

// Látogattad-e már a node-ot
{
  "in": ["forest_gate", { "var": "history" }]
}
```

## 3. Effect Processor (Hatás Feldolgozó)

### Feladata
- Node/choice hatások alkalmazása állapotra
- Tranzakcionális hatások (wallet)
- Inventory módosítások

### Effect Típusok

```typescript
type Effect =
  | { type: 'wallet'; op: '+' | '-'; value: number; reason?: string }
  | { type: 'item'; op: 'add' | 'remove'; key: string; qty: number }
  | { type: 'stat'; key: string; op: '+' | '-' | '='; value: number }
  | { type: 'hp'; op: '+' | '-'; value: number }
  | { type: 'flag'; key: string; value: boolean }
  | { type: 'variable'; key: string; value: any }
  | { type: 'status_effect'; key: string; duration: number; effects: Effect[] };
```

### Példa Implementáció

```typescript
class EffectProcessor {
  async apply(effects: Effect[], state: GameState): Promise<GameState> {
    const newState = { ...state };

    for (const effect of effects) {
      await this.applySingleEffect(effect, newState);
    }

    return newState;
  }

  private async applySingleEffect(effect: Effect, state: GameState): Promise<void> {
    switch (effect.type) {
      case 'wallet':
        await this.applyWalletEffect(effect, state);
        break;

      case 'item':
        this.applyItemEffect(effect, state);
        break;

      case 'stat':
        this.applyStatEffect(effect, state);
        break;

      case 'hp':
        this.applyHpEffect(effect, state);
        break;

      case 'flag':
        state.flags[effect.key] = effect.value;
        break;

      case 'variable':
        state.variables[effect.key] = effect.value;
        break;

      case 'status_effect':
        this.applyStatusEffect(effect, state);
        break;
    }
  }

  private async applyWalletEffect(effect: WalletEffect, state: GameState): Promise<void> {
    const delta = effect.op === '+' ? effect.value : -effect.value;
    state.wallet.balance += delta;

    // Log transaction
    await this.walletTxRepository.create({
      userId: state.userId,
      storyId: state.storyId,
      amount: delta,
      reason: effect.reason || 'Game event',
      nodeKey: state.currentNodeKey,
    });
  }

  private applyItemEffect(effect: ItemEffect, state: GameState): void {
    const existing = state.inventory.find(i => i.key === effect.key);

    if (effect.op === 'add') {
      if (existing) {
        existing.qty += effect.qty;
      } else {
        state.inventory.push({ key: effect.key, qty: effect.qty });
      }
    } else if (effect.op === 'remove') {
      if (existing) {
        existing.qty = Math.max(0, existing.qty - effect.qty);
        if (existing.qty === 0) {
          state.inventory = state.inventory.filter(i => i.key !== effect.key);
        }
      }
    }
  }

  private applyStatEffect(effect: StatEffect, state: GameState): void {
    const current = state.stats[effect.key];

    switch (effect.op) {
      case '+':
        state.stats[effect.key] = current + effect.value;
        break;
      case '-':
        state.stats[effect.key] = current - effect.value;
        break;
      case '=':
        state.stats[effect.key] = effect.value;
        break;
    }
  }

  private applyHpEffect(effect: HpEffect, state: GameState): void {
    const delta = effect.op === '+' ? effect.value : -effect.value;
    state.stats.hp = Math.max(0, Math.min(state.stats.maxHp, state.stats.hp + delta));
  }

  private applyStatusEffect(effect: StatusEffectData, state: GameState): void {
    state.statusEffects.push({
      key: effect.key,
      type: effect.type,
      duration: effect.duration,
      effects: effect.effects,
    });
  }
}
```

## 4. RNG Engine & Dice Roller

### Feladata
- Pseudo-random számgenerálás seeded RNG-vel
- Dice formula parsing (XdY+Z)
- Audit trail (roll logs)

### Implementáció

```typescript
import seedrandom from 'seedrandom';

class DiceRoller {
  async roll(formula: string, state: GameState): Promise<RollResult> {
    // Generate seed (timestamp + user + story + counter)
    const seed = this.generateSeed(state);
    const rng = seedrandom(seed);

    // Parse formula: 2d6+3
    const parsed = this.parseFormula(formula, state);

    // Roll dice
    const rolls: number[] = [];
    for (let i = 0; i < parsed.count; i++) {
      rolls.push(Math.floor(rng() * parsed.sides) + 1);
    }

    const total = rolls.reduce((sum, r) => sum + r, 0) + parsed.modifier;

    // Log roll
    await this.rollRepository.create({
      userId: state.userId,
      storyId: state.storyId,
      nodeKey: state.currentNodeKey,
      formula,
      result: total,
      seed,
      metadata: { rolls, breakdown: parsed },
    });

    return {
      formula,
      rolls,
      modifier: parsed.modifier,
      total,
      seed,
    };
  }

  parseFormula(formula: string, state: GameState): ParsedFormula {
    // Example: "2d6+3" or "1d20+PER"
    const match = formula.match(/(\d+)d(\d+)([\+\-]\w+)?/);

    if (!match) {
      throw new Error(`Invalid dice formula: ${formula}`);
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    let modifier = 0;

    if (match[3]) {
      const modStr = match[3].substring(1); // Remove +/-
      const op = match[3][0];

      // Check if modifier is stat or number
      if (isNaN(Number(modStr))) {
        // Stat modifier (e.g., PER, LCK)
        const statKey = modStr.toLowerCase();
        const statValue = state.stats[statKey] || 0;
        modifier = Math.floor((statValue - 10) / 2); // D&D style bonus
      } else {
        modifier = parseInt(modStr);
      }

      if (op === '-') modifier = -modifier;
    }

    return { count, sides, modifier };
  }

  private generateSeed(state: GameState): string {
    const timestamp = Date.now();
    const counter = state.variables['_roll_counter'] || 0;
    state.variables['_roll_counter'] = counter + 1;

    return `${state.userId}-${state.storyId}-${timestamp}-${counter}`;
  }
}
```

### Dice Check Execution

```typescript
class DiceCheckExecutor {
  async execute(check: DiceCheck, state: GameState): Promise<GameState> {
    const rollResult = await this.diceRoller.roll(check.formula, state);

    const success = rollResult.total >= check.dc;
    const outcome = success ? check.success : check.fail;

    // Apply outcome effects
    const newState = await this.effectProcessor.apply(outcome.effects, state);

    // Log outcome
    console.log(`[Dice Check] ${check.id}: ${outcome.log}`);

    return newState;
  }
}
```

## 5. Story Navigator

### Feladata
- Node navigáció (választás → új node)
- Feltételek ellenőrzése ugrás előtt
- Hatások alkalmazása
- History tracking

### Implementáció

```typescript
class StoryNavigator {
  async makeChoice(
    choiceId: string,
    state: GameState
  ): Promise<NavigationResult> {
    // Load current node
    const currentNode = await this.nodeRepository.find(
      state.storyId,
      state.currentNodeKey
    );

    // Find choice
    const choice = currentNode.choices.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error(`Choice not found: ${choiceId}`);
    }

    // Check conditions
    const allowed = choice.conditions.every(cond =>
      this.conditionEvaluator.evaluate(cond, state)
    );

    if (!allowed) {
      throw new Error('Choice conditions not met');
    }

    // Apply choice effects
    let newState = await this.effectProcessor.apply(choice.effects, state);

    // Navigate to target node
    const targetNode = await this.nodeRepository.find(
      state.storyId,
      choice.target
    );

    // Check node entry conditions
    const canEnter = targetNode.conditions.every(cond =>
      this.conditionEvaluator.evaluate(cond, newState)
    );

    if (!canEnter) {
      throw new Error('Cannot enter target node (conditions not met)');
    }

    // Apply node effects
    newState = await this.effectProcessor.apply(targetNode.effects, newState);

    // Execute dice checks (onEnter)
    for (const diceCheck of targetNode.dice_checks.filter(dc => dc.when === 'onEnter')) {
      newState = await this.diceCheckExecutor.execute(diceCheck, newState);
    }

    // Update state
    newState.currentNodeKey = choice.target;
    newState.history.push(choice.target);

    // Apply status effects (tick down)
    newState = this.tickStatusEffects(newState);

    // Auto-save
    await this.stateManager.saveState(newState, 0);

    return {
      state: newState,
      node: targetNode,
    };
  }

  private tickStatusEffects(state: GameState): GameState {
    const newState = { ...state };

    newState.statusEffects = newState.statusEffects
      .map(effect => {
        // Apply recurring effects
        this.effectProcessor.apply(effect.effects, newState);

        // Decrement duration
        return {
          ...effect,
          duration: effect.duration - 1,
        };
      })
      .filter(effect => effect.duration > 0); // Remove expired

    return newState;
  }
}
```

## 6. Minigame Integration

### Score Validation

```typescript
class MinigameValidator {
  async validateScore(
    gameKey: string,
    score: number,
    signature: string,
    sessionId: string
  ): Promise<boolean> {
    // Verify HMAC signature
    const expectedSig = this.generateSignature(gameKey, score, sessionId);

    if (signature !== expectedSig) {
      throw new Error('Invalid score signature');
    }

    // Check replay protection (nonce)
    const exists = await this.scoreRepository.existsBySession(sessionId);
    if (exists) {
      throw new Error('Score already submitted for this session');
    }

    return true;
  }

  async applyMinigameEffects(
    gameKey: string,
    score: number,
    state: GameState
  ): Promise<GameState> {
    const game = await this.minigameRepository.findByKey(state.storyId, gameKey);

    // Find matching score rule
    const rule = game.scoring_contract.map.find(r =>
      this.evaluateScoreCondition(r.if, score)
    );

    if (rule) {
      return await this.effectProcessor.apply(rule.effects, state);
    }

    return state;
  }

  private generateSignature(gameKey: string, score: number, sessionId: string): string {
    const hmac = crypto.createHmac('sha256', process.env.MINIGAME_SECRET);
    hmac.update(`${gameKey}:${score}:${sessionId}`);
    return hmac.digest('hex');
  }
}
```

---

## Teljesítmény Optimalizálás

- **Cache**: Node-ok Redis-ben (1 óra TTL)
- **Batch Operations**: Több effect egyszerre alkalmazva
- **Lazy Loading**: Csak aktuális node betöltése
- **State Compression**: Snapshot tömörítés (gzip)

## Tesztelés

```typescript
describe('GameEngine', () => {
  it('should apply wallet effect correctly', async () => {
    const state = createTestState({ balance: 100 });
    const effect: Effect = { type: 'wallet', op: '+', value: 50 };

    const newState = await effectProcessor.apply([effect], state);

    expect(newState.wallet.balance).toBe(150);
  });

  it('should evaluate complex condition', () => {
    const state = createTestState({
      balance: 100,
      inventory: [{ key: 'torch', qty: 1 }],
    });

    const condition: Condition = {
      expr: JSON.stringify({
        and: [
          { '>=': [{ var: 'wallet.balance' }, 50] },
          { var: 'has("torch")' },
        ],
      }),
    };

    const result = conditionEvaluator.evaluate(condition, state);
    expect(result).toBe(true);
  });
});
```

---

**Következő lépések:**
- Rate limiting bevezetése (Redis)
- WebSocket események (real-time state updates)
- Cheat detection (suspicious state transitions)
