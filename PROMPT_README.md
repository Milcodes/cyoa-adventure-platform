# 🤖 Claude Code Prompt - CYOA Adventure Platform Implementation

**Célállomány**: Teljes CYOA (Choose Your Own Adventure) platform implementációja a részletes rendszerterv alapján

**Projekt státusz**:
- 📋 Dokumentáció: **100% kész**
- 🏗️ Architektúra: **100% validált**
- 💻 Implementáció: **0% - Itt kezdd!**

---

## 📍 Te vagy itt: Implementációs Fázis

Helló Claude! 👋

Te most egy **teljes körűen dokumentált** projekttel dolgozol. Az architektúra, adatmodell, API design és minden dokumentáció **készen van**. A feladatod:

1. **Megérteni** a rendszertervet
2. **Megtervezni** az implementációt (lépésről lépésre)
3. **Kódolni** a teljes alkalmazást
4. **Tesztelni** minden funkcionalitást

A felhasználó **kontrollálja és jóváhagyja** a lépéseket, de **te tervezel és kódolsz**.

---

## 📚 Dokumentáció Helye

Minden szükséges információ megtalálható az alábbi fájlokban:

### Főbb Dokumentumok:

1. **Projekt Áttekintés**
   - 📄 `README.md` - Teljes projekt overview, architektúra diagram, tech stack

2. **Architektúra Dokumentáció**
   - 📄 `docs/architecture/data-model.md` - Teljes adatbázis séma (14 tábla)
   - 📄 `docs/architecture/game-engine.md` - Játékmotor architektúra (State Manager, Condition Evaluator, Effect Processor)
   - 📄 `docs/architecture/localization-system.md` - Többnyelvű rendszer (teljes API, UI mockup)

3. **Version B Specifikáció**
   - 📄 `docs/VERSION_B_COMPARISON.md` - Részletes feature lista, validáció, implementációs roadmap

4. **Konfigurációk**
   - 📄 `docker-compose.yml` - PostgreSQL, Redis, MinIO setup
   - 📄 `package.json` - Monorepo workspace konfiguráció
   - 📄 `turbo.json` - Build pipeline

### Útmutatók:

- 📄 `docs/guides/getting-started.md` - Development environment setup
- 📄 `CONTRIBUTING.md` - Kódstílus, commit guidelines

---

## 🎯 Feladatod: Teljes Implementáció

### Magas Szintű Célok:

1. ✅ **Backend API** (NestJS + TypeScript)
   - PostgreSQL adatbázis (Prisma ORM)
   - REST API + WebSocket
   - Game Engine (State Manager, RNG, Dice Roller)
   - Auth & Authorization (JWT + refresh token)
   - Localization API (fallback mechanizmus)
   - Moderation API

2. ✅ **Frontend** (Next.js 14 + React + TypeScript)
   - Játékos UI (story browser, gameplay screen)
   - Szerzői UI (story creator, translation editor)
   - Admin CMS (visual graph editor)
   - Moderátor dashboard
   - Language selector komponensek

3. ✅ **Database** (PostgreSQL + Prisma)
   - 14 tábla migrációk
   - Seed adatok (demo stories)
   - Indexelés és optimalizálás

4. ✅ **Testing**
   - Unit tests (játékmotor, utils)
   - Integration tests (API endpoints)
   - E2E tests (user journeys)

5. ✅ **Deployment**
   - Docker konténerizálás
   - GitHub Actions CI/CD
   - Production-ready setup

---

## 📖 PROMPT HASZNÁLATA

### 🚀 Kezdés (Lépés 1)

Amikor elkezded a munkát, először **olvasd el ezeket a fájlokat ebben a sorrendben**:

```
1. README.md - Projekt overview
2. docs/VERSION_B_COMPARISON.md - Feature lista és validáció
3. docs/architecture/data-model.md - Adatbázis séma
4. docs/architecture/game-engine.md - Játékmotor logika
5. docs/architecture/localization-system.md - Többnyelvű rendszer
```

### 📋 Fejlesztési Sorrend

Kövesd ezt a sorrendet az implementációnál:

#### **Phase 1: Backend Foundation** 🏗️

**1.1 Database Setup**
```bash
# Helyszín: apps/backend/

TASK: Prisma schema létrehozása
- 14 tábla (users, stories, story_nodes, story_translations, node_translations,
  inventory_items, user_inventory, wallets, wallet_tx, saves, rolls,
  minigames, minigame_scores, content_moderation)
- Összes relation (foreign keys, cascades)
- Indexek (GIN array indexek, composite indexek)
```

**Referencia**: `docs/architecture/data-model.md` (35-465 sor)

**Output elvárt**:
```
apps/backend/prisma/schema.prisma - Teljes schema
apps/backend/prisma/migrations/ - Migrációs fájlok
apps/backend/prisma/seed.ts - Demo adatok
```

**Checklist**:
- [ ] Prisma schema létrehozva (14 model)
- [ ] Relations helyesen definiálva
- [ ] Enums létrehozva (role, status, translation_status)
- [ ] Indexes konfigurálva
- [ ] Migration sikeresen lefutott
- [ ] Seed script működik

---

**1.2 Auth Module**
```bash
# Helyszín: apps/backend/src/api/auth/

TASK: Authentication & Authorization implementálása
- JWT + refresh token
- Role-based access control (player, author, admin, moderator)
- Password hashing (bcrypt)
- OAuth (Google/GitHub) opcionális
```

**Referencia**: `docs/architecture/localization-system.md` (sor 560-580)

**Output elvárt**:
```
apps/backend/src/api/auth/
├── auth.controller.ts (POST /auth/register, /auth/login, /auth/refresh)
├── auth.service.ts (business logic)
├── auth.guard.ts (JWT guard)
├── roles.guard.ts (RBAC guard)
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   └── token-response.dto.ts
└── __tests__/
    └── auth.service.spec.ts
```

**API Endpoints**:
```typescript
POST /auth/register
body: { email, password, display_name, preferred_language, role }
response: { access_token, refresh_token, user }

POST /auth/login
body: { email, password }
response: { access_token, refresh_token, user }

POST /auth/refresh
body: { refresh_token }
response: { access_token }

GET /auth/me (authenticated)
response: { user }
```

**Checklist**:
- [ ] Auth controller implementálva
- [ ] JWT guard működik
- [ ] Roles guard működik (RBAC)
- [ ] Password hashing működik
- [ ] Refresh token rotation
- [ ] Unit tesztek átmennek

---

**1.3 Game Engine Core**
```bash
# Helyszín: apps/backend/src/core/engine/

TASK: Játékmotor implementálása (kritikus komponens!)
- StateManager (állapot betöltés, mentés)
- ConditionEvaluator (feltételek kiértékelése, JSONLogic)
- EffectProcessor (hatások alkalmazása)
- DiceRoller (seeded RNG, XdY+Z formulák)
- StoryNavigator (választás → új node)
```

**Referencia**: `docs/architecture/game-engine.md` (teljes fájl!)

**Output elvárt**:
```
apps/backend/src/core/engine/
├── state-manager.ts (loadState, saveState, validateState)
├── condition-evaluator.ts (evaluate, evaluateJsonLogic)
├── effect-processor.ts (apply, applySingleEffect)
├── dice-roller.ts (roll, parseFormula, generateSeed)
├── story-navigator.ts (makeChoice, tickStatusEffects)
├── types/
│   ├── game-state.interface.ts
│   ├── condition.interface.ts
│   ├── effect.interface.ts
│   └── roll-result.interface.ts
└── __tests__/
    ├── state-manager.spec.ts
    ├── condition-evaluator.spec.ts
    ├── effect-processor.spec.ts
    └── dice-roller.spec.ts
```

**Kód példa** (StateManager):
```typescript
// Referencia: docs/architecture/game-engine.md sor 45-85
interface GameState {
  userId: string;
  storyId: string;
  currentNodeKey: string;
  inventory: InventoryItem[];
  wallet: { balance: number; currency: string };
  stats: { hp: number; maxHp: number; knowledge: number; /* ... */ };
  flags: Record<string, boolean>;
  variables: Record<string, any>;
  history: string[];
  statusEffects: StatusEffect[];
}

class StateManager {
  async loadState(userId: string, storyId: string): Promise<GameState> { /* ... */ }
  async saveState(state: GameState, slot: number = 0): Promise<void> { /* ... */ }
  validateState(state: GameState): ValidationResult { /* ... */ }
}
```

**Checklist**:
- [ ] StateManager implementálva és tesztelt
- [ ] ConditionEvaluator működik JSONLogic-kel
- [ ] EffectProcessor minden effect type-ot kezel
- [ ] DiceRoller seeded RNG (reprodukálható)
- [ ] StoryNavigator feltételeket és hatásokat alkalmazza
- [ ] Unit tesztek 80%+ coverage

---

**1.4 Gameplay API**
```bash
# Helyszín: apps/backend/src/api/gameplay/

TASK: Játékmenet API endpoint-ok
- State lekérése (current node + állapot)
- Választás végrehajtása
- Dobás (dice roll)
- Mentés/betöltés
- Minijáték score beküldése
```

**Referencia**: `docs/architecture/data-model.md` (sor 448-475)

**API Endpoints**:
```typescript
GET /play/{storyId}/state?language=hu
response: { node, state: { inventory, wallet, stats, ... } }

POST /play/{storyId}/choice
body: { choiceId, language }
response: { newState, newNode }

POST /play/{storyId}/roll
body: { formula, reason }
response: { roll: { total, rolls, seed }, newState }

POST /play/{storyId}/save
body: { slot }
response: { saveId }

GET /play/{storyId}/saves
response: { saves: [{ slot, node_key, created_at }] }

POST /play/{storyId}/minigame/score
body: { gameKey, score, signature, sessionId }
response: { newState, effects }
```

**Checklist**:
- [ ] GET /play/{storyId}/state implementálva
- [ ] POST /play/{storyId}/choice működik (feltételek, hatások)
- [ ] POST /play/{storyId}/roll működik (seeded RNG)
- [ ] Mentés/betöltés működik
- [ ] Minijáték score validálás (HMAC)
- [ ] Language parameter kezelése (fallback)
- [ ] Integration tesztek

---

**1.5 Localization API**
```bash
# Helyszín: apps/backend/src/api/localization/

TASK: Többnyelvű rendszer API
- Nyelvválasztás
- Story fordítások kezelése (author endpoint)
- Node fordítások kezelése
- Fallback mechanizmus (kért → primary → default)
```

**Referencia**: `docs/architecture/localization-system.md` (sor 280-355)

**API Endpoints (Author)**:
```typescript
POST /author/stories/{id}/translations
body: { locale, title, synopsis }
response: { translationId }

POST /author/nodes/{nodeId}/translations
body: { locale, text_md, choices_labels }
response: { translationId }

GET /author/stories/{id}/translation-status
response: {
  primary_language,
  translations: {
    "en": { story_meta: "complete", nodes: { total: 50, translated: 35, completion_percent: 70 } }
  }
}

DELETE /author/stories/{id}/translations/{locale}
```

**Fallback Logic**:
```typescript
// Referencia: docs/architecture/localization-system.md sor 280-330
async function getNodeContent(nodeId: string, locale: string): Promise<NodeContent> {
  // 1. Try requested language
  let translation = await findTranslation(nodeId, locale);
  if (translation) return { ...translation, fallback: false };

  // 2. Fallback to primary language
  translation = await findTranslation(nodeId, story.primary_language);
  if (translation) return { ...translation, fallback: true, fallback_warning: "..." };

  // 3. Default node text
  return { ...node, fallback: true };
}
```

**Checklist**:
- [ ] Translation CRUD endpoint-ok
- [ ] Fallback mechanizmus implementálva
- [ ] Translation status számítás
- [ ] Language selector data API
- [ ] Unit tesztek fallback logikára

---

**1.6 Moderation API**
```bash
# Helyszín: apps/backend/src/api/moderation/

TASK: Moderációs rendszer
- Pending stories listázása
- Story jóváhagyás (pending_review → published)
- Story elutasítás (pending_review → draft)
- Moderátori jegyzetek
```

**Referencia**: `docs/architecture/localization-system.md` (sor 655-710)

**API Endpoints**:
```typescript
GET /moderator/pending
response: {
  stories: [
    { story_id, title, author, submitted_at, language }
  ]
}

POST /moderator/stories/{id}/approve
response: { status: "published" }

POST /moderator/stories/{id}/reject
body: { notes: "Reason for rejection" }
response: { status: "draft" }
```

**Checklist**:
- [ ] Moderator guard (csak moderator/admin)
- [ ] Pending stories listázás
- [ ] Approve workflow (status update)
- [ ] Reject workflow (status + notes)
- [ ] Email notification szerzőnek (opcionális)

---

#### **Phase 2: Frontend Foundation** 🎨

**2.1 Project Setup**
```bash
# Helyszín: apps/frontend/

TASK: Next.js 14 App Router + TypeScript setup
- Tailwind CSS konfiguráció
- Folder structure (components, pages, hooks, store)
- API client (Axios + React Query)
- Auth context
```

**Output elvárt**:
```
apps/frontend/
├── src/
│   ├── app/ (Next.js 14 App Router)
│   │   ├── layout.tsx
│   │   ├── page.tsx (Landing page)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── stories/page.tsx (Story browser)
│   │   ├── play/[storyId]/page.tsx (Gameplay)
│   │   ├── author/ (Szerzői UI)
│   │   └── admin/ (Admin CMS)
│   ├── components/
│   │   ├── ui/ (Shadcn UI komponensek)
│   │   ├── game/ (Gameplay komponensek)
│   │   ├── author/ (Szerzői komponensek)
│   │   └── admin/ (Admin komponensek)
│   ├── hooks/
│   ├── store/ (Zustand vagy Redux)
│   ├── lib/
│   │   ├── api.ts (Axios instance)
│   │   └── auth.ts (Auth helper)
│   └── types/
├── public/
└── package.json
```

**Checklist**:
- [ ] Next.js 14 telepítve
- [ ] Tailwind konfigurálva
- [ ] Shadcn UI setup
- [ ] Axios + React Query setup
- [ ] Auth context (login state)

---

**2.2 Authentication UI**
```bash
# Helyszín: apps/frontend/src/app/(auth)/

TASK: Login & Registration oldalak
- Login form (email, password)
- Register form (email, password, display_name, preferred_language, role)
- Auth context & state management
```

**Checklist**:
- [ ] Login page
- [ ] Register page
- [ ] Auth context (JWT token storage)
- [ ] Protected route wrapper
- [ ] Redirect after login

---

**2.3 Story Browser**
```bash
# Helyszín: apps/frontend/src/app/stories/

TASK: Történetek böngészése (csempe UI)
- Story cards (borítókép, cím, műfaj, előrehaladás)
- Szűrők (műfaj, nyelv, státusz)
- Nyelvválasztó (fejléc + story oldal)
```

**Komponensek**:
```tsx
<StoryBrowser>
  <LanguageSelector /> // Fejléc
  <FilterBar genres={genres} languages={languages} />
  <StoryGrid>
    <StoryCard
      story={story}
      onLanguageSelect={(locale) => setStoryLanguage(locale)}
    />
  </StoryGrid>
</StoryBrowser>
```

**Checklist**:
- [ ] Story cards grid layout
- [ ] Szűrés (genre, language)
- [ ] Nyelvválasztó (header + story level)
- [ ] Progress % megjelenítés

---

**2.4 Gameplay Screen**
```bash
# Helyszín: apps/frontend/src/app/play/[storyId]/

TASK: Játékmenet képernyő (node megjelenítés + választások)
- Node text (markdown rendering)
- Média megjelenítés (kép/videó)
- Választási gombok (disabled ha feltétel nem teljesül)
- Státuszsáv (HP, pénz, inventory)
- Dobás animáció (dice rolling UI)
```

**Referencia**: `README.md` (sor 224-235)

**Komponensek**:
```tsx
<GameplayScreen>
  <TopBar title={story.title} />
  <MediaPanel media={node.media} />
  <TextPanel markdown={node.text_md} />
  <ChoicesPanel>
    {node.choices.map(choice => (
      <ChoiceButton
        choice={choice}
        disabled={!meetsConditions(choice)}
        onSelect={() => makeChoice(choice.id)}
      />
    ))}
  </ChoicesPanel>
  <StatusBar>
    <Wallet balance={state.wallet.balance} />
    <Inventory items={state.inventory} />
    <Stats hp={state.stats.hp} />
  </StatusBar>
</GameplayScreen>
```

**Checklist**:
- [ ] Node rendering (markdown + media)
- [ ] Choice buttons (disabled state + tooltip)
- [ ] Status bar komponensek
- [ ] Dice roll animation
- [ ] Fallback warning megjelenítése
- [ ] WebSocket events (real-time updates)

---

**2.5 Author CMS**
```bash
# Helyszín: apps/frontend/src/app/author/

TASK: Szerzői felület (saját történetek készítése)
- Story CRUD (create, edit, publish)
- Node editor (JSON editor + preview)
- Translation editor (key-by-key translation)
- Publish workflow (submit for review)
```

**Komponensek**:
```tsx
<AuthorDashboard>
  <MyStories stories={myStories} />
  <CreateStoryButton />
</AuthorDashboard>

<StoryEditor storyId={id}>
  <StoryMetaForm /> // title, synopsis, genre, primary_language
  <NodeEditor nodes={nodes} />
  <TranslationPanel>
    <LanguageSelector />
    <TranslationEditor locale={selectedLocale} />
  </TranslationPanel>
  <PublishButton onClick={submitForReview} />
</StoryEditor>
```

**Referencia**: `docs/architecture/localization-system.md` (sor 718-750)

**Checklist**:
- [ ] My stories listázás
- [ ] Story create/edit form
- [ ] Node JSON editor (Monaco editor)
- [ ] Translation editor UI
- [ ] Translation status megjelenítés
- [ ] Submit for review gomb

---

**2.6 Moderator Dashboard**
```bash
# Helyszín: apps/frontend/src/app/moderator/

TASK: Moderátori felület
- Pending stories listázása
- Story preview (sandbox)
- Approve/Reject gombok + notes
```

**Komponensek**:
```tsx
<ModeratorDashboard>
  <PendingStories>
    {pendingStories.map(story => (
      <PendingStoryCard
        story={story}
        onApprove={() => approveStory(story.id)}
        onReject={(notes) => rejectStory(story.id, notes)}
      />
    ))}
  </PendingStories>
</ModeratorDashboard>
```

**Checklist**:
- [ ] Pending stories listázás
- [ ] Story preview modal
- [ ] Approve button
- [ ] Reject modal (notes textarea)
- [ ] Email notification trigger

---

**2.7 Admin CMS (Visual Graph Editor)**
```bash
# Helyszín: apps/frontend/src/app/admin/

TASK: Admin felület (minden történet szerkesztése)
- Visual graph editor (React Flow)
- Node editor (drag & drop)
- Media manager (upload + preview)
- Validation (orphan nodes, loops)
```

**Referencia**: `README.md` (sor 39-50)

**Komponensek**:
```tsx
<AdminCMS>
  <StoryList stories={allStories} />
  <VisualGraphEditor storyId={id}>
    <ReactFlowCanvas nodes={nodes} edges={edges} />
    <NodeEditorPanel selectedNode={node} />
  </VisualGraphEditor>
  <MediaManager onUpload={uploadToS3} />
  <ValidationPanel errors={validationErrors} />
</AdminCMS>
```

**Checklist**:
- [ ] React Flow integráció
- [ ] Node drag & drop
- [ ] Edge creation (choice → target)
- [ ] Node editor panel
- [ ] Media upload (S3)
- [ ] Validation warnings

---

#### **Phase 3: Testing & Quality** 🧪

**3.1 Unit Tests**
```bash
# Backend unit tesztek

TASK: Kritikus komponensek unit tesztje
- Game Engine (StateManager, ConditionEvaluator, EffectProcessor, DiceRoller)
- Auth service (JWT, password hashing)
- Localization service (fallback logic)
```

**Elvárt coverage**: 80%+

**Tesztek**:
```typescript
// apps/backend/src/core/engine/__tests__/state-manager.spec.ts
describe('StateManager', () => {
  it('should load state from latest save', async () => { /* ... */ });
  it('should validate HP bounds', () => { /* ... */ });
});

// apps/backend/src/core/engine/__tests__/effect-processor.spec.ts
describe('EffectProcessor', () => {
  it('should apply wallet effect correctly', async () => { /* ... */ });
  it('should apply item add effect', () => { /* ... */ });
});
```

**Checklist**:
- [ ] Game Engine tesztek (100+ test case)
- [ ] Auth service tesztek
- [ ] Localization tesztek (fallback)
- [ ] Coverage report (80%+)

---

**3.2 Integration Tests**
```bash
# API integration tesztek

TASK: API endpoint-ok tesztje (Supertest)
- Auth flow (register → login → refresh)
- Gameplay flow (state → choice → new state)
- Translation CRUD
- Moderation workflow
```

**Tesztek**:
```typescript
// apps/backend/test/gameplay.e2e-spec.ts
describe('Gameplay API (e2e)', () => {
  it('POST /play/{storyId}/choice should update state', async () => {
    const response = await request(app.getHttpServer())
      .post('/play/story-123/choice')
      .set('Authorization', `Bearer ${token}`)
      .send({ choiceId: 'to_house', language: 'hu' })
      .expect(200);

    expect(response.body.newState.currentNodeKey).toBe('house_front');
  });
});
```

**Checklist**:
- [ ] Auth API tesztek
- [ ] Gameplay API tesztek
- [ ] Author API tesztek
- [ ] Moderator API tesztek
- [ ] Localization API tesztek

---

**3.3 E2E Tests**
```bash
# End-to-end tesztek (Playwright/Cypress)

TASK: Felhasználói útvonalak tesztje
- User journey: Register → Browse → Play → Save
- Author journey: Create story → Add translation → Submit
- Moderator journey: Review → Approve
```

**Tesztek**:
```typescript
// apps/frontend/e2e/gameplay.spec.ts
test('User can play a story from start to finish', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'player@test.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.goto('/stories');
  await page.click('text=Demo Story');
  await page.click('button:has-text("Start Adventure")');

  // Make choices...
  await page.click('button:has-text("A távoli ház felé")');

  // Assert state updated
  await expect(page.locator('.current-node')).toContainText('house_front');
});
```

**Checklist**:
- [ ] User flow e2e tesztek
- [ ] Author flow e2e tesztek
- [ ] Moderator flow e2e tesztek
- [ ] Language switching e2e tesztek

---

#### **Phase 4: Deployment** 🚀

**4.1 Docker Setup**
```bash
# Dockerfile-ok és docker-compose

TASK: Production-ready Docker setup
- Backend Dockerfile (multi-stage build)
- Frontend Dockerfile (Next.js optimalizált build)
- docker-compose.yml frissítése
```

**Fájlok**:
```dockerfile
# apps/backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

**Checklist**:
- [ ] Backend Dockerfile
- [ ] Frontend Dockerfile
- [ ] docker-compose.yml frissítve
- [ ] Environment variables dokumentálva
- [ ] Health check endpoint-ok

---

**4.2 CI/CD Pipeline**
```bash
# GitHub Actions workflow

TASK: Automated testing + deployment
- Linter & formatter check
- Unit + integration tesztek futtatása
- E2E tesztek
- Docker image build + push
```

**Fájl**:
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: docker build -t cyoa-backend apps/backend
      - run: docker build -t cyoa-frontend apps/frontend
```

**Checklist**:
- [ ] CI workflow (lint, test)
- [ ] CD workflow (build, deploy)
- [ ] Environment secrets konfigurálva

---

**4.3 Production Checklist**
```bash
TASK: Production readiness ellenőrzés
```

**Security**:
- [ ] Environment variables (secrets nem commit-olva)
- [ ] JWT secrets erősek
- [ ] HTTPS enabled (SSL cert)
- [ ] CORS konfigurálva
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled (admin endpoints)
- [ ] XSS protection (CSP headers)
- [ ] SQL injection védelem (Prisma parameterized queries)
- [ ] HMAC signature minijátékokhoz

**Performance**:
- [ ] Redis cache enabled
- [ ] Database indexek helyén
- [ ] CDN setup (statikus eszközök)
- [ ] Image optimization (Next.js Image)
- [ ] API response compression
- [ ] Database connection pooling

**Monitoring**:
- [ ] Logging (Winston/Pino → ELK stack)
- [ ] Error tracking (Sentry)
- [ ] Metrics (Prometheus + Grafana)
- [ ] Uptime monitoring
- [ ] Database backup strategy

---

## 🎯 IMPLEMENTÁCIÓS STRATÉGIA

### Lépésről Lépésre Megközelítés:

#### **Módszer 1: Iteratív Fejlesztés** (Ajánlott)

1. **Iteráció 1 - Foundation** (Nap 1-3)
   - Database setup (Prisma schema)
   - Auth module (login/register)
   - Basic gameplay API (state, choice)
   - Frontend: Login + Story browser

   **Demo**: "Felhasználó be tud jelentkezni és látja a story listát"

2. **Iteráció 2 - Core Gameplay** (Nap 4-7)
   - Game Engine implementáció (teljes)
   - Gameplay API (choice, roll, save)
   - Frontend: Gameplay screen

   **Demo**: "Felhasználó tud játszani egy demo történetet, dobni, menteni"

3. **Iteráció 3 - Localization** (Nap 8-10)
   - Translation tables & API
   - Fallback mechanizmus
   - Frontend: Language selector

   **Demo**: "Story játszható magyar és német nyelven"

4. **Iteráció 4 - Creator Platform** (Nap 11-14)
   - Author API
   - Author UI (story create, translation editor)
   - Moderation API & UI

   **Demo**: "Szerző tud történetet készíteni, fordítani és moderációra küldeni"

5. **Iteráció 5 - Admin CMS** (Nap 15-18)
   - Visual graph editor (React Flow)
   - Node editor
   - Media manager

   **Demo**: "Admin tud vizuálisan szerkeszteni történeteket"

6. **Iteráció 6 - Polish & Testing** (Nap 19-21)
   - Unit tests
   - Integration tests
   - E2E tests
   - Bug fixes
   - Performance optimization

#### **Módszer 2: Vertikális Slice** (Alternatíva)

1. **Slice 1**: Auth + Story Browser
2. **Slice 2**: Gameplay (egy egyszerű story végig)
3. **Slice 3**: Localization (egy story fordítása)
4. **Slice 4**: Author CMS (story creation)
5. **Slice 5**: Moderation
6. **Slice 6**: Admin (visual editor)

---

## 💬 KOMMUNIKÁCIÓ A FELHASZNÁLÓVAL

### Minden Iteráció Végén Kérdezd Meg:

1. **"Készen vagyok az [X] iterációval. Demo:"**
   - Mutasd be, mi működik
   - Add meg a curl parancsokat vagy URL-eket tesztelésre

2. **"Mit szeretnél elsőbbséggel látni a következő iterációban?"**
   - Hadd döntsön a felhasználó

3. **"Van valami, amit másképp kellene megoldani?"**
   - Fogadd el a visszajelzést

### Checkpoint-ok:

- ✅ **Phase 1 vége**: "Backend API készen van. Tesztelhető Postman-nel vagy curl-lel. Folytatjuk a Frontend-del?"
- ✅ **Phase 2 vége**: "Frontend alapok működnek. Lehet navigálni, bejelentkezni. Folytatjuk a Gameplay képernyővel?"
- ✅ **Phase 3 vége**: "Tesztek írva, 85% coverage. Folytatjuk a Deployment-tel?"

---

## 🐛 HIBAELHÁRÍTÁS

### Ha Elakadsz:

1. **Adatbázis hiba**
   - Nézd meg: `docs/architecture/data-model.md`
   - Példa query-k: sor 448-500

2. **Játékmotor logika hiba**
   - Nézd meg: `docs/architecture/game-engine.md`
   - Példa implementáció: sor 45-260

3. **Lokalizáció hiba**
   - Nézd meg: `docs/architecture/localization-system.md`
   - Fallback logika: sor 280-330

4. **API design kérdés**
   - Nézd meg: `docs/VERSION_B_COMPARISON.md` sor 380-450

### Ha Nem Vagy Biztos Valamiben:

**Kérdezd meg a felhasználót!** Használd az `AskUserQuestion` tool-t:

```
"Két lehetőség van a [X] megoldására:
1. [Opció A]: Előnyök/hátrányok
2. [Opció B]: Előnyök/hátrányok

Melyiket preferálod?"
```

---

## ✅ VÉGSŐ CHECKLIST

### Backend:
- [ ] Prisma schema (14 model, relations, indexes)
- [ ] Auth module (JWT, RBAC, 4 role)
- [ ] Game Engine (StateManager, ConditionEvaluator, EffectProcessor, DiceRoller, StoryNavigator)
- [ ] Gameplay API (state, choice, roll, save, minigame)
- [ ] Localization API (translations, fallback)
- [ ] Moderation API (pending, approve, reject)
- [ ] Author API (story CRUD, translation CRUD)
- [ ] Admin API (all stories CRUD)
- [ ] WebSocket events (real-time updates)
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests (API endpoints)

### Frontend:
- [ ] Next.js 14 App Router setup
- [ ] Auth UI (login, register)
- [ ] Story Browser (cards, filters, language selector)
- [ ] Gameplay Screen (node rendering, choices, status bar, dice animation)
- [ ] Author CMS (story editor, translation editor, publish)
- [ ] Moderator Dashboard (pending list, approve/reject)
- [ ] Admin CMS (visual graph editor, node editor, media manager)
- [ ] Language Selector (header + story level)
- [ ] Fallback warning display
- [ ] E2E tests (user journeys)

### Database:
- [ ] 14 tábla migrálva
- [ ] Indexek létrehozva
- [ ] Seed adatok (demo stories, users)
- [ ] Foreign keys & cascades helyesen

### DevOps:
- [ ] Docker Compose frissítve
- [ ] Backend Dockerfile
- [ ] Frontend Dockerfile
- [ ] GitHub Actions CI/CD
- [ ] Environment variables dokumentálva
- [ ] Health check endpoint-ok
- [ ] Monitoring setup (logs, metrics)

### Documentation:
- [ ] API documentation (OpenAPI spec)
- [ ] README frissítve (setup instructions)
- [ ] Architecture docs pontos
- [ ] Deployment guide

---

## 🚀 KEZDÉS

**Amikor készen állsz, mondd ezt:**

> "Elolvastam a dokumentációt. Kezdjük az implementációt!
> Első lépés: Prisma schema létrehozása a `docs/architecture/data-model.md` alapján.
> Folytathatom?"

**Aztán menj lépésről lépésre, iterációról iterációra.**

**Sok sikert! 🎮**

---

**Made with ❤️ by Claude Code**
