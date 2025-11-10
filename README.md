# 🎮 CYOA Adventure Platform

**Interaktív Választható Kaland Platform** - Egy modern, webes Choose Your Own Adventure (CYOA) játékmotor teljes körű szerkesztő felülettel.

## 📋 Tartalomjegyzék

- [Áttekintés](#áttekintés)
- [Funkciók](#funkciók)
- [Architektúra](#architektúra)
- [Technológiai Stack](#technológiai-stack)
- [Projekt Struktúra](#projekt-struktúra)
- [Gyors Kezdés](#gyors-kezdés)
- [Fejlesztés](#fejlesztés)
- [Dokumentáció](#dokumentáció)

## 🎯 Áttekintés

Egy teljes körű webes platform interaktív történetek létrehozására és játszására, amely tartalmazza:

- **Játékos Élmény**: Történetek böngészése és játszása elágazásokkal, véletlen eseményekkel, minijátékokkal
- **Szerkesztő Felület**: Vizuális gráf-alapú story editor adminok számára
- **Játékmotor**: Szerveroldali szabálykezelés, RNG, feltételek és hatások rendszere
- **Inventory & Economy**: Tárgyak gyűjtése, pénzgazdálkodás, jutalmak
- **Mentés/Betöltés**: Automatikus és manuális mentési rendszer

### 🌍 Vízió: Nyelvtanuló és Creator Platform

A platform hosszú távú célja, hogy **egyaránt szolgálja a játékosokat és a tartalomkészítőket**, valamint támogassa a **nyelvtanulást**:

- **Játékos választja a nyelvet**: Minden történet több nyelven elérhető (HU/DE/EN/ES/FR/stb.)
- **AI-asszisztált tartalom**: Automatikus fordítás, szöveggenerálás (GPT integráció)
- **Community-driven**: Bárki lehet játékos ÉS tartalomkészítő
- **Immerzív nyelvtanulás**: Játék közben tanulás természetes kontextusban
- **Marketplace**: Közösség által készített történetek böngészése, értékelése, vásárlása

> *"Tanulj nyelveket úgy, hogy közben kalandokat élsz át!"*

## ✨ Funkciók

### 🎮 Játékos Oldal
- ✅ Regisztráció és autentikáció (JWT + OAuth)
- ✅ **Nyelvválasztás**: Játék tetszőleges nyelven (HU/DE/EN/ES/FR/stb.)
- ✅ Történetek böngészése csempe-alapú UI-on (nyelv szerint szűrhető)
- ✅ Interaktív játékmenet választásokkal
- ✅ Inventory és pénzgazdálkodás
- ✅ Véletlen események (dice rolls)
- ✅ Beépített minijátékok (sandbox iframe)
- ✅ Mentés/betöltés rendszer (auto + 3 manuális slot)
- 🌍 **Nyelvtanulási mód**: Párhuzamos szövegek, szótár, kiemelések

### 🛠️ Admin/Szerkesztő Oldal (Creator Platform)
- ✅ Vizuális story graph szerkesztő
- ✅ Node-ok létrehozása (szöveg, média, feltételek, hatások)
- ✅ **Többnyelvű tartalom**: Minden node több nyelven szerkeszthető
- ✅ **AI-asszisztált írás**: Automatikus fordítás, szöveggenerálás (GPT integráció)
- ✅ Választások és elágazások kezelése
- ✅ Tárgyak és pénznem definiálása
- ✅ Minijáték integráció beállítása
- ✅ Média feltöltés és menedzsment
- ✅ Preview funkció (bármely nyelven)
- ✅ Validáció (elárvult node-ok, körök detektálása)
- 🌍 **Kombinált szerep**: Játékos ÉS tartalomkészítő egyben

### 🎲 Játékmotor
- ✅ Szerveroldali állapotkezelés
- ✅ Feltétel kiértékelés (JSONLogic)
- ✅ Hatások alkalmazása (pénz, inventory, stats, HP)
- ✅ Dice roll rendszer (XdY+Z formulák)
- ✅ Tudás/ügyesség alapú bónuszok
- ✅ Időzített státusz effektek (mérgezés, csapda)

## 🏗️ Architektúra

### Magas Szintű Áttekintés

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │  Game UI (React) │              │  Admin CMS       │     │
│  │  - Story Tiles   │              │  - Graph Editor  │     │
│  │  - Gameplay View │              │  - Node Editor   │     │
│  │  - Inventory     │              │  - Media Manager │     │
│  └──────────────────┘              └──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                    REST + WebSocket
                          │
┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Game Engine (NestJS/FastAPI)               │   │
│  │  - State Management    - Rule Engine                 │   │
│  │  - RNG System          - Condition Evaluator         │   │
│  │  - Effect Processor    - Minigame Score Validator    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌────▼────┐   ┌─────▼─────┐
    │ PostgreSQL│   │  Redis  │   │  S3/CDN   │
    │  Stories  │   │  Cache  │   │   Media   │
    │  Users    │   │  Queue  │   │   Assets  │
    │  Saves    │   │ Session │   │           │
    └───────────┘   └─────────┘   └───────────┘
```

### Adatfolyam

1. **Játékos Interakció**: Választás gomb → POST `/play/{storyId}/choice`
2. **Szabálymotor**: Feltételek ellenőrzése → Hatások alkalmazása
3. **Állapotfrissítés**: Inventory/Wallet módosítás → Új node betöltése
4. **Response**: Új game state + választási lehetőségek

## 🛠️ Technológiai Stack

### Frontend
- **Framework**: React 18 + Next.js 14 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: Zustand / Redux Toolkit
- **API Client**: Axios + React Query
- **Real-time**: Socket.io Client (WebSocket)
- **Testing**: Vitest + React Testing Library

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10 (vagy FastAPI ha Python)
- **Language**: TypeScript (vagy Python 3.11+)
- **Validation**: class-validator + class-transformer
- **ORM**: Prisma / TypeORM (vagy SQLAlchemy)
- **Auth**: JWT + Passport.js, OAuth2
- **Testing**: Jest + Supertest

### Infrastructure
- **Database**: PostgreSQL 15+ (relációs + JSONB)
- **Cache**: Redis 7+ (session, rate limit, queue)
- **Storage**: S3-compatible (MinIO/AWS S3)
- **CDN**: CloudFront / CloudFlare
- **Container**: Docker + Docker Compose
- **IaC**: Terraform (opcionális)
- **Orchestration**: Kubernetes (production)

### DevOps & Monitoring
- **CI/CD**: GitHub Actions
- **Logging**: Winston / Pino → ELK Stack
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Security**: OWASP Top 10, CSRF, XSS/CSP védelem

## 📁 Projekt Struktúra

```
cyoa-adventure-platform/
├── apps/
│   ├── frontend/              # Next.js frontend alkalmazás
│   │   ├── src/
│   │   │   ├── components/    # React komponensek
│   │   │   │   ├── game/      # Játék UI komponensek
│   │   │   │   ├── admin/     # Admin CMS komponensek
│   │   │   │   └── common/    # Közös komponensek
│   │   │   ├── pages/         # Next.js oldalak
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── store/         # State management
│   │   │   ├── types/         # TypeScript típusok
│   │   │   └── utils/         # Helper funkciók
│   │   ├── public/            # Statikus fájlok
│   │   └── package.json
│   │
│   └── backend/               # NestJS backend alkalmazás
│       ├── src/
│       │   ├── api/           # API controllers & routes
│       │   │   ├── auth/
│       │   │   ├── stories/
│       │   │   ├── gameplay/
│       │   │   └── admin/
│       │   ├── core/          # Business logic & domain
│       │   │   ├── engine/    # Game engine
│       │   │   ├── rules/     # Rule system
│       │   │   └── services/  # Core services
│       │   └── infrastructure/ # External services
│       │       ├── db/        # Database models & repos
│       │       ├── cache/     # Redis cache
│       │       └── storage/   # S3 storage
│       ├── prisma/            # Prisma schema & migrations
│       └── package.json
│
├── packages/
│   └── shared/                # Megosztott típusok és utils
│       ├── types/             # Közös TypeScript interfészek
│       ├── constants/         # Konstansok
│       └── validators/        # Közös validációs logika
│
├── docs/
│   ├── architecture/          # Architektúra dokumentáció
│   │   ├── system-design.md
│   │   ├── data-model.md
│   │   └── game-engine.md
│   ├── api/                   # API dokumentáció
│   │   ├── openapi.yaml       # OpenAPI 3.0 spec
│   │   └── endpoints.md
│   └── guides/                # Fejlesztői útmutatók
│       ├── getting-started.md
│       ├── story-creation.md
│       └── minigame-integration.md
│
├── docker-compose.yml         # Local development setup
├── .gitignore
├── LICENSE
└── README.md
```

## 🚀 Gyors Kezdés

### Előfeltételek

- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (ajánlott)
- pnpm/npm/yarn

### Telepítés (Docker-rel)

```bash
# Repository klónozása
git clone https://github.com/Milcodes/cyoa-adventure-platform.git
cd cyoa-adventure-platform

# Environment fájlok másolása
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Docker konténerek indítása
docker-compose up -d

# Adatbázis migráció futtatása
docker-compose exec backend npm run migrate

# Alkalmazás elérhető:
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# Admin: http://localhost:3000/admin
```

### Telepítés (Manual)

```bash
# Függőségek telepítése
npm install

# PostgreSQL és Redis indítása (külön)

# Backend setup
cd apps/backend
cp .env.example .env
npm install
npm run migrate
npm run seed # Demo stories betöltése
npm run dev

# Frontend setup (új terminál)
cd apps/frontend
cp .env.example .env
npm install
npm run dev
```

## 💻 Fejlesztés

### Parancsok

```bash
# Fejlesztői környezet indítása
npm run dev

# Build (production)
npm run build

# Tesztek futtatása
npm run test
npm run test:e2e

# Linting & formatting
npm run lint
npm run format

# Adatbázis migráció
npm run migrate
npm run migrate:rollback

# Seed adatok
npm run seed
```

### Git Workflow

```bash
# Feature branch létrehozása
git checkout -b feature/story-graph-editor

# Commitok
git add .
git commit -m "feat: Add visual story graph editor"

# Push és PR
git push origin feature/story-graph-editor
```

### Kódstílus

- **ESLint** + **Prettier** konfiguráció
- Conventional Commits (feat, fix, docs, chore, etc.)
- TypeScript strict mode
- 80% test coverage minimum

## 📚 Dokumentáció

Részletes dokumentáció a `docs/` könyvtárban:

- [Rendszerterv](docs/architecture/system-design.md)
- [Adatmodell](docs/architecture/data-model.md)
- [Játékmotor](docs/architecture/game-engine.md)
- [API Referencia](docs/api/endpoints.md)
- [Story Készítési Útmutató](docs/guides/story-creation.md)
- [Minijáték Integráció](docs/guides/minigame-integration.md)

## 🔒 Biztonság

- Szerveroldali állapot-autoritatív logika
- HMAC aláírás minijáték score-okra
- Rate limiting minden endpoint-on
- CSRF védelem admin felületen
- XSS védelem (CSP headers)
- Iframe sandbox minijátékokhoz
- JWT refresh token rotation
- Input validáció minden szinten

## 🧪 Tesztelés

### Test Pyramid

```
       ┌───────────────┐
       │  E2E Tests    │ 10%  (Cypress/Playwright)
       │               │
      ┌┴───────────────┴┐
      │ Integration      │ 30%  (API tests)
      │                  │
     ┌┴──────────────────┴┐
     │  Unit Tests         │ 60%  (Jest/Vitest)
     │                     │
     └─────────────────────┘
```

### Test Coverage

- Unit: Business logic, utils, validators
- Integration: API endpoints, database operations
- E2E: Critical user journeys (registration, gameplay, admin)

## 🎯 MVP Scope (v1.0)

- [x] Felhasználó regisztráció/bejelentkezés
- [x] Story böngészés csempés UI-on
- [x] Játékmotor: szöveg, média, választások, feltételek, hatások
- [x] Inventory és pénz rendszer
- [x] Dice roll mechanika
- [x] Mentés/betöltés (auto + 3 slot)
- [x] Admin: Story/Node CRUD, JSON editor
- [x] Média feltöltés (S3)
- [x] 1 demo minijáték (iframe)

## 🗺️ Roadmap

### v1.1 - Enhanced Editor
- [ ] Drag & drop visual graph editor
- [ ] Node templates library
- [ ] Bulk operations
- [ ] Version control for stories

### v1.2 - Social Features
- [ ] Leaderboards
- [ ] User comments & ratings
- [ ] Story recommendations
- [ ] User profiles & achievements

### v1.3 - Advanced Gameplay
- [ ] Character stats & leveling
- [ ] Perks & skills tree
- [ ] Multiplayer events
- [ ] Real-time co-op stories

### v2.0 - Language Learning Platform 🌍
- [ ] **Multi-language Content System**
  - [ ] Node translations (manual + AI-assisted)
  - [ ] Language selector for players
  - [ ] Parallel text view (original + translation)
- [ ] **AI Content Generation**
  - [ ] GPT-powered story generation
  - [ ] Automatic translation
  - [ ] Context-aware suggestions
- [ ] **Learning Features**
  - [ ] Vocabulary highlights & dictionary
  - [ ] Progress tracking per language
  - [ ] Difficulty levels (A1-C2)
  - [ ] Pronunciation audio (TTS)
- [ ] **Community Creator Platform**
  - [ ] User-generated stories (publish workflow)
  - [ ] Story ratings & reviews
  - [ ] Monetization (premium content)
  - [ ] Creator analytics & insights

### v3.0 - Platform Expansion
- [ ] Mobile apps (React Native)
- [ ] PWA offline support
- [ ] Global marketplace for multilingual stories
- [ ] Mod support & plugin system

## 🤝 Közreműködés

Contributions are welcome! Kérjük olvasd el a [CONTRIBUTING.md](CONTRIBUTING.md) fájlt.

## 📄 Licensz

MIT License - lásd [LICENSE](LICENSE) fájl

## 👥 Csapat

- **Project Lead**: [Milcodes](https://github.com/Milcodes)

## 📞 Támogatás

- 🐛 Bug reports: [GitHub Issues](https://github.com/Milcodes/cyoa-adventure-platform/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Milcodes/cyoa-adventure-platform/discussions)
- 📧 Email: support@cyoa-platform.dev

---

**Made with ❤️ by Milcodes**
