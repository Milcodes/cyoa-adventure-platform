# Adatmodell és Adatbázis Séma

## Áttekintés

A CYOA platform PostgreSQL adatbázist használ relációs adatok tárolására, JSONB mezőkkel dinamikus tartalmakhoz. A séma célja:

- Felhasználók és autentikáció kezelése
- Történetek (stories) és csomópontok (nodes) tárolása
- Játékos állapot nyomon követése (inventory, pénz, mentések)
- Játékmenet események auditálása (dobások, választások)
- Minijáték integráció támogatása

## Főbb Táblák

### 1. Users (Felhasználók)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    pw_hash VARCHAR(255) NOT NULL,
    locale VARCHAR(5) DEFAULT 'hu',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    flags JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'player' -- player, admin, moderator
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Mezők:**
- `id`: Egyedi felhasználó azonosító (UUID)
- `email`: Email cím (login)
- `display_name`: Megjelenített név
- `pw_hash`: Bcrypt jelszó hash
- `locale`: Nyelvi beállítás (hu/de/en)
- `flags`: Egyéni flagek JSON-ben (achievements, preferences, stb.)
- `role`: Felhasználói szerep

---

### 2. Stories (Történetek)

```sql
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    synopsis TEXT,
    genre VARCHAR(50), -- fantasy, sci-fi, horror, mystery, etc.
    cover_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB -- extra fields: difficulty, estimated_time, tags
);

CREATE INDEX idx_stories_slug ON stories(slug);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_genre ON stories(genre);
CREATE INDEX idx_stories_created_by ON stories(created_by);
```

**Mezők:**
- `slug`: URL-friendly egyedi azonosító
- `title`: Történet címe
- `synopsis`: Rövid leírás
- `genre`: Műfaj
- `status`: Státusz (draft/published/archived)
- `metadata`: Extra adatok (nehézség, becsült időtartam, címkék)

---

### 3. Story Nodes (Csomópontok)

```sql
CREATE TABLE story_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL, -- unique within story
    text_md TEXT NOT NULL,
    media_ref VARCHAR(500), -- S3 URL vagy media ID
    layout VARCHAR(20) DEFAULT 'image', -- image, video, html, audio
    dice_checks JSONB DEFAULT '[]'::JSONB,
    conditions JSONB DEFAULT '[]'::JSONB,
    effects JSONB DEFAULT '[]'::JSONB,
    choices JSONB DEFAULT '[]'::JSONB,
    is_terminal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(story_id, key)
);

CREATE INDEX idx_story_nodes_story_id ON story_nodes(story_id);
CREATE INDEX idx_story_nodes_key ON story_nodes(story_id, key);
CREATE INDEX idx_story_nodes_terminal ON story_nodes(story_id, is_terminal);
```

**JSONB Struktúrák:**

**dice_checks:**
```json
[
  {
    "id": "trap_aware",
    "when": "onEnter",
    "formula": "1d20+PER",
    "dc": 12,
    "success": {
      "log": "+1 tudás",
      "effects": [{"type": "stat", "key": "knowledge", "op": "+", "value": 1}]
    },
    "fail": {
      "log": "Beleléptél a csapdába (-5 HP)",
      "effects": [{"type": "hp", "op": "-", "value": 5}]
    }
  }
]
```

**conditions:**
```json
[
  {"expr": "wallet.balance >= 5"},
  {"expr": "has('torch')"},
  {"expr": "stat.knowledge > 10"}
]
```

**effects:**
```json
[
  {"type": "wallet", "op": "-", "value": 1, "reason": "erdőbelépési díj"},
  {"type": "item", "op": "add", "key": "sword", "qty": 1},
  {"type": "stat", "key": "hp", "op": "-", "value": 5}
]
```

**choices:**
```json
[
  {
    "id": "to_house",
    "label": "A távoli ház felé mész",
    "target": "house_front",
    "conditions": [],
    "effects": []
  }
]
```

---

### 4. Inventory Items (Tárgy definíciók)

```sql
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL, -- unique within story
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, legendary
    stackable BOOLEAN DEFAULT true,
    icon_url VARCHAR(500),
    meta JSONB DEFAULT '{}'::JSONB, -- extra properties: weight, value, effects
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(story_id, key)
);

CREATE INDEX idx_inventory_items_story_id ON inventory_items(story_id);
```

---

### 5. User Inventory (Játékos inventory)

```sql
CREATE TABLE user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    item_key VARCHAR(100) NOT NULL,
    qty INTEGER DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, story_id, item_key)
);

CREATE INDEX idx_user_inventory_user_story ON user_inventory(user_id, story_id);
```

---

### 6. Wallets (Pénztárcák)

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    balance NUMERIC(15, 2) DEFAULT 0,
    currency VARCHAR(20) DEFAULT 'gold', -- gold, coins, credits
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

CREATE INDEX idx_wallets_user_story ON wallets(user_id, story_id);
```

---

### 7. Wallet Transactions (Tranzakciók)

```sql
CREATE TABLE wallet_tx (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    reason VARCHAR(255),
    node_key VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_user_story ON wallet_tx(user_id, story_id);
CREATE INDEX idx_wallet_tx_created_at ON wallet_tx(created_at);
```

---

### 8. Saves (Mentések)

```sql
CREATE TABLE saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    slot INTEGER DEFAULT 0, -- 0 = auto, 1-3 = manual slots
    node_key VARCHAR(100) NOT NULL,
    snapshot_json JSONB NOT NULL, -- teljes állapot: inventory, wallet, stats, flags
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, story_id, slot)
);

CREATE INDEX idx_saves_user_story ON saves(user_id, story_id);
CREATE INDEX idx_saves_slot ON saves(user_id, story_id, slot);
```

**snapshot_json példa:**
```json
{
  "node_key": "forest_gate",
  "inventory": [
    {"key": "torch", "qty": 1},
    {"key": "potion", "qty": 3}
  ],
  "wallet": {
    "balance": 150,
    "currency": "gold"
  },
  "stats": {
    "hp": 85,
    "knowledge": 12,
    "dexterity": 8,
    "strength": 10,
    "luck": 5
  },
  "flags": {
    "met_wizard": true,
    "defeated_dragon": false
  },
  "history": ["start", "crossroads", "forest_gate"]
}
```

---

### 9. Rolls (Dobások)

```sql
CREATE TABLE rolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    node_key VARCHAR(100) NOT NULL,
    formula VARCHAR(50) NOT NULL, -- 2d6+1, 1d20+PER
    result INTEGER NOT NULL,
    seed VARCHAR(64), -- RNG seed for verification
    metadata JSONB DEFAULT '{}'::JSONB, -- breakdown, modifiers
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rolls_user_story ON rolls(user_id, story_id);
CREATE INDEX idx_rolls_node_key ON rolls(story_id, node_key);
CREATE INDEX idx_rolls_created_at ON rolls(created_at);
```

---

### 10. Minigames (Minijáték definíciók)

```sql
CREATE TABLE minigames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL, -- unique within story
    title VARCHAR(255) NOT NULL,
    entry_url VARCHAR(500) NOT NULL, -- iframe URL
    scoring_contract JSONB NOT NULL, -- score mapping to effects
    allowed_origins TEXT[], -- CORS whitelist
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(story_id, key)
);

CREATE INDEX idx_minigames_story_id ON minigames(story_id);
```

**scoring_contract példa:**
```json
{
  "map": [
    {
      "if": "score >= 500",
      "effects": [{"type": "wallet", "op": "+", "value": 50}]
    },
    {
      "if": "score < 100",
      "effects": [{"type": "hp", "op": "-", "value": 3}]
    }
  ]
}
```

---

### 11. Minigame Scores (Minijáték eredmények)

```sql
CREATE TABLE minigame_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    game_key VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL,
    signature VARCHAR(255) NOT NULL, -- HMAC verification
    mapped_effects JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_minigame_scores_user_story ON minigame_scores(user_id, story_id);
CREATE INDEX idx_minigame_scores_game_key ON minigame_scores(story_id, game_key);
CREATE INDEX idx_minigame_scores_created_at ON minigame_scores(created_at);
```

---

## Kapcsolatok (Relationships)

```
users
  ├─→ stories (created_by)
  ├─→ user_inventory
  ├─→ wallets
  ├─→ wallet_tx
  ├─→ saves
  ├─→ rolls
  └─→ minigame_scores

stories
  ├─→ story_nodes
  ├─→ inventory_items
  ├─→ minigames
  ├─→ wallets (story scope)
  └─→ saves

story_nodes
  └─→ choices (embedded JSONB) → target_node_key
```

## Indexelési Stratégia

1. **Primary Keys**: UUID alapú (gen_random_uuid())
2. **Foreign Keys**: Automatikus indexek
3. **Query Patterns**:
   - User + Story scope: `(user_id, story_id)` composite index
   - Story lookup: `slug`, `status`, `genre`
   - Node lookup: `(story_id, key)` unique constraint
   - Temporal queries: `created_at` index

## Migrációs Stratégia

- **Prisma** vagy **TypeORM** migrations
- Verziókezelés: timestamp-based
- Rollback support
- Seed data: demo stories, test users

## Biztonság

- **Row-level Security** (RLS): Tenant isolation story_id alapján
- **Soft Delete**: `deleted_at` timestamp (opcionális)
- **Audit Trail**: `created_at`, `updated_at` minden táblán
- **JSONB Validation**: Check constraints vagy application-level validation

## Teljesítmény Optimalizálás

- **JSONB indexek**: GIN indexek feltételekre és hatásokra
- **Partíciók**: `rolls`, `wallet_tx` táblákon (ha nagy volumen)
- **Connection Pooling**: PgBouncer vagy beépített pool
- **Read Replicas**: Terhelés elosztás read-heavy query-kre

## Példa Query-k

### 1. Játékos állapot lekérése

```sql
SELECT
    sn.key,
    sn.text_md,
    sn.media_ref,
    sn.choices,
    w.balance,
    w.currency,
    COALESCE(json_agg(
        json_build_object('key', ui.item_key, 'qty', ui.qty)
    ) FILTER (WHERE ui.item_key IS NOT NULL), '[]') as inventory
FROM story_nodes sn
LEFT JOIN wallets w ON w.user_id = $1 AND w.story_id = $2
LEFT JOIN user_inventory ui ON ui.user_id = $1 AND ui.story_id = $2
WHERE sn.story_id = $2 AND sn.key = $3
GROUP BY sn.id, w.balance, w.currency;
```

### 2. Story lista (published only)

```sql
SELECT
    s.id,
    s.slug,
    s.title,
    s.synopsis,
    s.genre,
    s.cover_url,
    sv.progress_percent
FROM stories s
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) FILTER (WHERE is_terminal) * 100.0 / NULLIF(COUNT(*), 0) as progress_percent
    FROM story_nodes
    WHERE story_id = s.id
) sv ON true
WHERE s.status = 'published'
ORDER BY s.created_at DESC;
```

### 3. Mentés létrehozása

```sql
INSERT INTO saves (user_id, story_id, slot, node_key, snapshot_json)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, story_id, slot)
DO UPDATE SET
    node_key = EXCLUDED.node_key,
    snapshot_json = EXCLUDED.snapshot_json,
    created_at = NOW();
```

---

**Következő lépések:**
- Prisma schema generálása
- Seed scriptek írása demo történetekhez
- Query optimalizálási teszt
