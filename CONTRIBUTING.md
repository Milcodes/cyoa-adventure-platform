# Közreműködési Útmutató

Köszönjük az érdeklődésedet a CYOA Adventure Platform fejlesztésében! Ez a dokumentum útmutatást ad, hogyan járulhatsz hozzá a projekthez.

## 📋 Tartalomjegyzék

- [Code of Conduct](#code-of-conduct)
- [Hogyan járulhatok hozzá?](#hogyan-járulhatok-hozzá)
- [Fejlesztési Környezet](#fejlesztési-környezet)
- [Pull Request Folyamat](#pull-request-folyamat)
- [Kódstílus](#kódstílus)
- [Commit Üzenetek](#commit-üzenetek)
- [Bug Jelentések](#bug-jelentések)
- [Feature Javaslatok](#feature-javaslatok)

## Code of Conduct

Kérjük, légy tiszteletteljes és befogadó minden közreműködővel szemben. Elvárásaink:

- Használj barátságos és befogadó nyelvezetet
- Tiszteld a különböző nézőpontokat
- Fogadd a konstruktív kritikát
- Fókuszálj arra, ami a legjobb a közösség számára

## Hogyan járulhatok hozzá?

### 1. Issues & Discussions

- **Bug Report**: Találtál hibát? Nyiss egy issue-t a [GitHub Issues](https://github.com/Milcodes/cyoa-adventure-platform/issues) oldalon
- **Feature Request**: Van ötleted? Kezdj egy beszélgetést a [Discussions](https://github.com/Milcodes/cyoa-adventure-platform/discussions) oldalon
- **Kérdések**: Ne habozz kérdezni a Discussions-ben!

### 2. Kód Hozzájárulás

1. **Fork** a repository-t
2. **Clone** a forked repo-t a gépedre
3. Hozz létre egy új **feature branch**-et: `git checkout -b feature/amazing-feature`
4. Végezd el a módosításokat
5. **Commit**-old a változásokat: `git commit -m 'feat: Add amazing feature'`
6. **Push**-old a branch-et: `git push origin feature/amazing-feature`
7. Nyiss egy **Pull Request**-et

### 3. Dokumentáció

A dokumentáció javítások ugyanúgy értékesek! Ha találsz:
- Elírást
- Hiányos magyarázatot
- Elavult információt

...nyugodtan küldj PR-t!

## Fejlesztési Környezet

### Előfeltételek

```bash
node --version  # v20+
npm --version   # v10+
docker --version
```

### Setup

```bash
# Clone a repo
git clone https://github.com/YOUR_USERNAME/cyoa-adventure-platform.git
cd cyoa-adventure-platform

# Install dependencies
npm install

# Start services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Run migrations
cd apps/backend
npm run migrate

# Start dev servers
npm run dev
```

### Tesztek Futtatása

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## Pull Request Folyamat

### PR Checklist

Mielőtt PR-t nyitsz, győződj meg róla, hogy:

- [ ] A kód buildelődik hiba nélkül: `npm run build`
- [ ] Minden teszt átmegy: `npm test`
- [ ] Linter hiba nincs: `npm run lint`
- [ ] Kód formázva: `npm run format`
- [ ] Új funkciókhoz tesztek készültek
- [ ] Dokumentáció frissítve (ha szükséges)
- [ ] Commit üzenetek conventional formátumban vannak

### PR Sablon

Használd ezt a sablont a PR leírásához:

```markdown
## 📝 Összefoglaló

Mit változtat ez a PR?

## 🎯 Motiváció

Miért van szükség erre a változásra?

## 🔧 Változások

- Modul A: módosítás X
- Modul B: hozzáadás Y
- ...

## 🧪 Tesztelés

Hogyan tesztelted a változásokat?

## 📸 Screenshot (ha releváns)

## ✅ Checklist

- [ ] Tests pass
- [ ] Linter pass
- [ ] Documentation updated
```

## Kódstílus

### TypeScript

- **Strict mode** enabled
- **ESLint** + **Prettier** konfigurációt követjük
- **Functional components** React-ben (hooks)
- **Async/await** promise-ok helyett

### Elnevezési Konvenciók

```typescript
// ✅ Good
class UserService {}
interface GameState {}
type EffectType = 'wallet' | 'item';
const MAX_INVENTORY_SIZE = 100;
function calculateBonus(stat: number): number {}

// ❌ Bad
class userservice {}
interface gamestate {}
type effecttype = string;
const maxInventorySize = 100;
function calc_bonus(s: number): number {}
```

### File Structure

```
feature/
├── feature.controller.ts    # API endpoint
├── feature.service.ts        # Business logic
├── feature.repository.ts     # Data access
├── feature.dto.ts            # DTOs
├── feature.types.ts          # Types/interfaces
└── __tests__/
    ├── feature.service.test.ts
    └── feature.controller.test.ts
```

## Commit Üzenetek

Használjuk a **Conventional Commits** formátumot:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Új funkció
- `fix`: Bug fix
- `docs`: Dokumentáció változás
- `style`: Formázás, pontosvessző, stb.
- `refactor`: Kód átstrukturálás
- `test`: Tesztek hozzáadása/módosítása
- `chore`: Build, CI, dependencies

### Példák

```bash
feat(game-engine): Add dice roll advantage/disadvantage mechanic

Implements D&D 5e style advantage/disadvantage for skill checks.
When advantage is active, roll 2d20 and take the higher value.

Closes #123

---

fix(auth): Resolve JWT refresh token race condition

The previous implementation had a race condition where multiple
simultaneous requests could cause token refresh to fail.

Fixes #456

---

docs(api): Update OpenAPI spec with new endpoints

- Added /api/v1/minigames endpoints
- Updated authentication examples
```

## Bug Jelentések

Amikor bug-ot jelentesz, adj meg minél több információt:

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Browser [e.g. Chrome 120]
 - Node version: [e.g. 20.11.0]

**Additional context**
Add any other context about the problem here.
```

## Feature Javaslatok

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request.
```

## Kérdések?

Ha bármilyen kérdésed van:

- 💬 [GitHub Discussions](https://github.com/Milcodes/cyoa-adventure-platform/discussions)
- 📧 Email: support@cyoa-platform.dev
- 🐛 [GitHub Issues](https://github.com/Milcodes/cyoa-adventure-platform/issues)

---

**Köszönjük a hozzájárulásod! 🎉**
