# Technical Decisions - CYOA Platform

Ez a dokumentum rögzíti a platform fejlesztése során hozott kulcsfontos technikai döntéseket és azok indoklását.

---

## 📋 Tartalomjegyzék

- [1. Kódolási Konvenciók](#1-kódolási-konvenciók)
- [2. Stat Rendszer](#2-stat-rendszer)
- [3. Lokalizációs Szabályok](#3-lokalizációs-szabályok)
- [4. Moderációs Workflow](#4-moderációs-workflow)
- [5. Implementációs Prioritások](#5-implementációs-prioritások)

---

## 1. Kódolási Konvenciók

### 1.1 Nyelvhasználat a Kódban

**Döntés:** Minden változónév, függvénynév és adatbázis mezőnév **angol nyelven**

**Indoklás:**
- Nemzetközi best practice
- TypeScript/JavaScript konvenciók
- Könnyebb maintainability
- Jobb integráció third-party library-kkel

**Példák:**
```typescript
// ✅ Helyes
interface GameStats {
  knowledge: number;  // Tudás
  dexterity: number;  // Ügyesség
  strength: number;   // Erő
  luck: number;       // Szerencse
}

// ❌ Helytelen
interface GameStats {
  tudás: number;
  ügyesség: number;
  erő: number;
  szerencse: number;
}
```

**UI Megjelenítés:**
```typescript
// Lokalizált megjelenítés
const statLabels = {
  hu: {
    knowledge: 'Tudás',
    dexterity: 'Ügyesség',
    strength: 'Erő',
    luck: 'Szerencse'
  },
  en: {
    knowledge: 'Knowledge',
    dexterity: 'Dexterity',
    strength: 'Strength',
    luck: 'Luck'
  },
  de: {
    knowledge: 'Wissen',
    dexterity: 'Geschicklichkeit',
    strength: 'Stärke',
    luck: 'Glück'
  }
};
```

---

## 2. Stat Rendszer

### 2.1 Stat Modifier Számítás

**Döntés:** D&D-style modifier formula: `(STAT - 10) / 2` (lefelé kerekítve)

**Indoklás:**
- Jól ismert és tesztelt rendszer (D&D, Pathfinder)
- Balanced: stat értékek 1-20 tartományban
- Bónuszok és büntetések természetesen skálázódnak
- Intuitív játékosoknak, akik ismerik a rendszert

**Formula:**
```typescript
function calculateModifier(statValue: number): number {
  return Math.floor((statValue - 10) / 2);
}

// Példák:
// STAT = 8  → modifier = -1
// STAT = 10 → modifier = 0
// STAT = 12 → modifier = +1
// STAT = 16 → modifier = +3
// STAT = 20 → modifier = +5
```

**Használat dice formula-ban:**
```typescript
// Formula: "1d20+dexterity"
const dexModifier = calculateModifier(state.stats.dexterity);
const roll = rollDice(1, 20) + dexModifier;

// Ha dexterity = 16 → modifier = +3
// Roll: 1d20+3
```

### 2.2 Stat Értékek Tartománya

**Döntés:** Stat értékek 1-20 tartományban

**Alapértelmezett kezdő értékek:**
```typescript
const defaultStats = {
  hp: 100,
  max_hp: 100,
  knowledge: 10,   // +0 modifier
  dexterity: 10,   // +0 modifier
  strength: 10,    // +0 modifier
  luck: 10         // +0 modifier
};
```

**Extrém értékek:**
- Minimum: 1 (modifier: -5)
- Maximum: 20 (modifier: +5)

---

## 3. Lokalizációs Szabályok

### 3.1 Translation Status - Automatikus Számítás

**Döntés:** Translation status **automatikusan** számítódik a node fordítások alapján

**Automatikus szabályok:**
```typescript
function calculateTranslationStatus(storyId: string, locale: string): TranslationStatus {
  const totalNodes = await countNodes(storyId);
  const translatedNodes = await countTranslatedNodes(storyId, locale);

  const completionPercent = Math.round((translatedNodes / totalNodes) * 100);

  // Automatikus status meghatározás
  const nodeStatus = completionPercent === 100 ? 'complete' : 'incomplete';

  return {
    story_meta: storyMetaTranslated ? 'complete' : 'incomplete',
    nodes: {
      total: totalNodes,
      translated: translatedNodes,
      incomplete: totalNodes - translatedNodes,
      completion_percent: completionPercent
    }
  };
}
```

**Indoklás:**
- Mindig aktuális és pontos
- Nincs manuális munka (kevesebb hiba)
- Szerző azonnal látja a haladást
- Egyszerű implementáció

**Story Meta Translation Status:**
- **complete**: Ha `title` és `synopsis` is lefordítva
- **incomplete**: Ha bármelyik hiányzik

### 3.2 Nyelvválasztó Fallback Sorrend

**Döntés:** Nyelvválasztás sorrendje

```typescript
function resolveLanguage(
  userChoice?: string,
  userProfile?: User,
  browserLocale?: string,
  storyPrimaryLanguage?: string
): string {
  // 1. Explicit user választás (UI selector)
  if (userChoice) return userChoice;

  // 2. User profil preferred_language
  if (userProfile?.preferred_language) return userProfile.preferred_language;

  // 3. Browser locale (navigator.language)
  if (browserLocale) {
    const lang = browserLocale.split('-')[0]; // 'en-US' → 'en'
    if (supportedLanguages.includes(lang)) return lang;
  }

  // 4. Story primary language (ha story kontextusban vagyunk)
  if (storyPrimaryLanguage) return storyPrimaryLanguage;

  // 5. Fallback: 'hu' (platform default)
  return 'hu';
}
```

**Indoklás:**
- Explicit választás prioritás (felhasználó tudatosan választott)
- Profil beállítás második (perzisztens preferencia)
- Browser locale harmadik (implicit preferencia)
- Story primary language negyedik (kontextuális fallback)
- Platform default ötödik (mindig van eredmény)

### 3.3 Content Fallback Mechanizmus

**Döntés:** 3-szintű fallback content lekéréskor

```typescript
async function getNodeContent(nodeId: string, locale: string): Promise<NodeContent> {
  const node = await getNode(nodeId);
  const story = await getStory(node.story_id);

  // 1. Próbáld a kért nyelven
  let translation = await getNodeTranslation(nodeId, locale);
  if (translation) {
    return {
      ...node,
      text_md: translation.text_md,
      choices: mergeChoiceLabels(node.choices, translation.choices_labels),
      locale: locale,
      fallback: false
    };
  }

  // 2. Fallback a story elsődleges nyelvére
  if (locale !== story.primary_language) {
    translation = await getNodeTranslation(nodeId, story.primary_language);
    if (translation) {
      return {
        ...node,
        text_md: translation.text_md,
        choices: mergeChoiceLabels(node.choices, translation.choices_labels),
        locale: story.primary_language,
        fallback: true,
        fallback_warning: `Content not available in ${locale}, showing ${story.primary_language}`
      };
    }
  }

  // 3. Végső fallback: node alapértelmezett text_md
  return {
    ...node,
    locale: story.primary_language,
    fallback: true,
    fallback_warning: `Translation missing`
  };
}
```

**UI Figyelmeztetés:**
```tsx
{fallback && (
  <Alert variant="warning" className="mb-4">
    ⚠️ {fallback_warning}
  </Alert>
)}
```

**Indoklás:**
- Soha nincs üres content
- Progresszív fallback (legjobb elérhető verzió)
- Felhasználó tudja, hogy fallback-et lát
- Szerző motiválva van a fordítás befejezésére

### 3.4 Lokalizált Media Assets (MVP után)

**Döntés:** Nyelvfüggő subtitle és audio **NINCS** MVP-ben, v2.0-ban kerül hozzáadásra

**MVP scope:**
- ✅ Story meta fordítás (title, synopsis)
- ✅ Node text fordítás (text_md)
- ✅ Choice label fordítás
- ❌ Subtitle fájlok (VTT)
- ❌ Audio narration
- ❌ Lokalizált képek (ritka)

**v2.0 scope:**
```typescript
// Tervezett struktúra (v2.0)
interface LocalizedMedia {
  base: string;  // s3://assets/forest.jpg
  subtitles?: {
    [locale: string]: string;  // s3://assets/subtitles/forest_hu.vtt
  };
  audio?: {
    [locale: string]: string;  // s3://assets/audio/forest_narration_de.mp3
  };
}
```

**Indoklás:**
- MVP-ben elég a szöveges fordítás (core function)
- Media lokalizáció drága és időigényes
- Később könnyen hozzáadható (backward compatible)
- Iteratív fejlesztés (first working, then perfect)

---

## 4. Moderációs Workflow

### 4.1 Email Notification

**Döntés:** Email notification **MVP UTÁN** implementálva

**MVP scope:**
- ✅ Dashboard notification (in-app)
- ✅ Moderátor látja a pending listát
- ✅ Szerző látja a story status-t
- ❌ Email küldés (nodemailer/SendGrid)

**v1.1 scope:**
```typescript
// Tervezett email notification (v1.1)
async function notifyAuthorOfRejection(storyId: string, notes: string) {
  const story = await getStory(storyId);
  const author = await getUser(story.created_by);

  await sendEmail({
    to: author.email,
    subject: `Story "${story.title}" needs revision`,
    template: 'story_rejected',
    data: {
      story_title: story.title,
      moderator_notes: notes,
      story_url: `https://platform.dev/author/stories/${storyId}`
    }
  });
}
```

**Indoklás:**
- Dashboard notification elég MVP-re (core function)
- Email infrastruktúra külön setup (SendGrid API key, template-ek)
- Spam/deliverability problémák kezelése
- MVP fokusz: core játékmenet és lokalizáció
- Később könnyen hozzáadható (nem breaking change)

### 4.2 Moderátor Preview Funkció

**Döntés:** MVP-ben **metadata + node lista**, v1.1-ben **sandbox play**

**MVP scope:**
```typescript
// GET /moderator/stories/{id}
{
  story_id: "...",
  title: "Das verlorene Schwert",
  author: "user123",
  primary_language: "de",
  available_languages: ["de", "en"],
  node_count: 47,
  nodes: [
    { key: "start", text_preview: "You embark on a legendary...", choices_count: 4 },
    { key: "forest_gate", text_preview: "You enter the forest...", choices_count: 2 },
    // ...
  ],
  submitted_at: "2025-01-10T10:00:00Z"
}
```

**v1.1 scope:**
- Sandbox play mode (read-only)
- Visual graph preview (node diagram)
- Quick validation (orphan nodes, loops)

**Indoklás:**
- MVP-ben elég a node lista (moderátor gyorsan átfutja)
- Sandbox play komplex (külön játékmotor session)
- Visual graph editor későbbi prioritás (v1.1)
- Iteratív fejlesztés

---

## 5. Implementációs Prioritások

### 5.1 MVP Feature Set (Végleges)

**✅ BENNE VAN MVP-BEN:**
1. Auth (register, login, JWT, RBAC)
2. Story browser (published stories)
3. Gameplay (node navigation, choices, dice rolls)
4. Inventory & Wallet
5. Save/Load (auto + 3 manual slots)
6. **Lokalizáció (story + node translations, fallback)**
7. **Szerzői szerepkör (story creation, translation editor)**
8. **Moderációs workflow (pending → approve/reject)**
9. Basic admin (story/node CRUD)

**❌ NINCS MVP-BEN (v1.1+):**
1. Email notifications
2. Lokalizált media (subtitle, audio)
3. Moderátor sandbox play
4. Visual graph editor (admin)
5. Nyelvtanuló mód (kétpaneles nézet)
6. AI-asszisztált fordítás (GPT integráció)
7. OAuth (Google/GitHub login)
8. WebSocket real-time updates
9. PWA offline support

### 5.2 Fejlesztési Sorrend

**Phase 1: Backend Foundation (Napok 1-7)**
1. Database setup (Prisma schema, migrations)
2. Auth module (JWT, RBAC)
3. Game Engine (StateManager, ConditionEvaluator, EffectProcessor, DiceRoller)
4. Gameplay API (state, choice, roll, save)
5. Localization API (translations, fallback)
6. Author API (story CRUD, translation CRUD)
7. Moderator API (pending, approve, reject)

**Phase 2: Frontend Foundation (Napok 8-14)**
1. Next.js 14 setup (App Router, Tailwind)
2. Auth UI (login, register)
3. Story Browser (csempe UI, filters)
4. Gameplay Screen (node rendering, choices, status bar)
5. Language Selector komponens
6. Author CMS (story editor, translation editor)
7. Moderator Dashboard

**Phase 3: Testing & Polish (Napok 15-18)**
1. Unit tests (Game Engine, 80%+ coverage)
2. Integration tests (API endpoints)
3. E2E tests (user journeys)
4. Bug fixes
5. Performance optimization

**Phase 4: Deployment (Napok 19-21)**
1. Docker setup
2. CI/CD pipeline (GitHub Actions)
3. Production checklist (security, monitoring)

---

## 6. Stat Key Mapping Reference

### 6.1 Támogatott Stat Key-ek

```typescript
type StatKey = 'knowledge' | 'dexterity' | 'strength' | 'luck' | 'hp';

const STAT_KEYS = {
  KNOWLEDGE: 'knowledge',  // INT - Tudás/Intelligencia
  DEXTERITY: 'dexterity',  // DEX - Ügyesség
  STRENGTH: 'strength',    // STR - Erő
  LUCK: 'luck'             // LCK - Szerencse
} as const;
```

### 6.2 Dice Formula Rövidítések

**Támogatott formula formátumok:**
```typescript
// Explicit stat név (ajánlott)
"1d20+knowledge"
"2d6+dexterity"
"1d12+strength"

// Rövidítés (opcionális támogatás)
"1d20+INT"  → "1d20+knowledge"
"2d6+DEX"   → "2d6+dexterity"
"1d12+STR"  → "1d12+strength"
"1d20+LCK"  → "1d20+luck"

// Numerikus modifier
"2d6+3"
"1d20-2"
```

### 6.3 Példa Node - Dice Check

```json
{
  "key": "trap_room",
  "text_md": "You enter a dark room. The floor creaks ominously...",
  "dice_checks": [
    {
      "id": "perception_check",
      "when": "onEnter",
      "formula": "1d20+knowledge",
      "dc": 14,
      "success": {
        "log": "You notice the tripwire! +1 Knowledge",
        "effects": [
          { "type": "stat", "key": "knowledge", "op": "+", "value": 1 }
        ]
      },
      "fail": {
        "log": "You trigger the trap! -10 HP",
        "effects": [
          { "type": "hp", "op": "-", "value": 10 }
        ]
      }
    }
  ]
}
```

---

## 7. Validation Rules

### 7.1 Story Validation (Author Submit előtt)

**Automatikus validáció a "Submit for Review" gomb előtt:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

async function validateStory(storyId: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Van-e start node?
  const startNode = await findNodeByKey(storyId, 'start');
  if (!startNode) {
    errors.push({ type: 'missing_start_node', message: 'Story must have a start node' });
  }

  // 2. Van-e legalább 1 terminal node?
  const terminalNodes = await countTerminalNodes(storyId);
  if (terminalNodes === 0) {
    errors.push({ type: 'no_terminal_nodes', message: 'Story must have at least one ending' });
  }

  // 3. Orphan nodes (elérhetetlen node-ok)
  const orphanNodes = await findOrphanNodes(storyId);
  if (orphanNodes.length > 0) {
    warnings.push({
      type: 'orphan_nodes',
      message: `${orphanNodes.length} unreachable nodes found`,
      details: orphanNodes.map(n => n.key)
    });
  }

  // 4. Circular loops (végtelen ciklusok)
  const loops = await detectCircularLoops(storyId);
  if (loops.length > 0) {
    warnings.push({
      type: 'circular_loops',
      message: 'Possible infinite loops detected',
      details: loops
    });
  }

  // 5. Broken choice targets
  const brokenChoices = await findBrokenChoices(storyId);
  if (brokenChoices.length > 0) {
    errors.push({
      type: 'broken_choices',
      message: `${brokenChoices.length} choices point to non-existent nodes`,
      details: brokenChoices
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

**UI megjelenítés:**
```tsx
<ValidationPanel>
  {!validation.valid && (
    <ErrorList>
      {validation.errors.map(err => (
        <ErrorItem key={err.type} severity="error">
          {err.message}
        </ErrorItem>
      ))}
    </ErrorList>
  )}

  {validation.warnings.length > 0 && (
    <WarningList>
      {validation.warnings.map(warn => (
        <WarningItem key={warn.type} severity="warning">
          {warn.message}
        </WarningItem>
      ))}
    </WarningList>
  )}

  <Button
    disabled={!validation.valid}
    onClick={submitForReview}
  >
    Submit for Review
  </Button>
</ValidationPanel>
```

**Indoklás:**
- Errors blokkolják a submit-ot (törött story nem mehet moderációra)
- Warnings nem blokkolják (de figyelmeztetik a szerzőt)
- Automatikus validáció csökkenti a moderátori terhelést

---

## 8. Összefoglalás

### Kulcsfontosságú Döntések:

1. ✅ **Angol kód, lokalizált UI** - Best practice
2. ✅ **D&D-style stat modifiers** - Jól ismert rendszer
3. ✅ **Automatikus translation status** - Mindig aktuális
4. ✅ **3-szintű fallback** - Soha nincs üres content
5. ✅ **Dashboard notification MVP-ben** - Email később
6. ✅ **Metadata preview MVP-ben** - Sandbox play később
7. ✅ **Szöveges lokalizáció MVP-ben** - Media később
8. ✅ **Automatikus validáció** - Minőségi content

### Következő Lépés:

**READY FOR IMPLEMENTATION** ✅

Kezdhetjük a Phase 1 implementációját:
1. Prisma schema létrehozása
2. Auth module
3. Game Engine
4. API endpoint-ok

---

**Dokumentum frissítve:** 2025-01-10
**Státusz:** Végleges ✅
