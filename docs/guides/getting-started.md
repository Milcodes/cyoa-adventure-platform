# Getting Started Guide

Ebben az útmutatóban végigvezetünk, hogyan indítsd el a CYOA Adventure Platform fejlesztői környezetét.

## Előfeltételek

Mielőtt elkezdenéd, győződj meg róla, hogy telepítve vannak:

- **Node.js** 20+ LTS ([letöltés](https://nodejs.org/))
- **npm** 10+ (Node.js-sel együtt jön)
- **Docker** és **Docker Compose** ([letöltés](https://www.docker.com/))
- **Git** ([letöltés](https://git-scm.com/))

### Ellenőrzés

```bash
node --version   # v20.11.0 vagy újabb
npm --version    # v10.2.4 vagy újabb
docker --version # Docker version 24.0.0 vagy újabb
git --version    # git version 2.40.0 vagy újabb
```

## 1. Repository Klónozása

```bash
# HTTPS
git clone https://github.com/Milcodes/cyoa-adventure-platform.git

# vagy SSH
git clone git@github.com:Milcodes/cyoa-adventure-platform.git

# Lépj be a könyvtárba
cd cyoa-adventure-platform
```

## 2. Függőségek Telepítése

```bash
# Root szinten telepítsük a workspace függőségeket
npm install
```

Ez telepíti az összes függőséget a monorepo-ban (frontend, backend, packages).

## 3. Environment Változók Beállítása

### Backend

```bash
cd apps/backend
cp .env.example .env
```

Szerkeszd a `.env` fájlt (opcionális, alapértelmezett értékek működnek local dev-hez):

```env
# Database
DATABASE_URL=postgresql://cyoa_user:cyoa_password@localhost:5432/cyoa_game

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (változtasd meg production-ben!)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# S3 Storage (MinIO local)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=minio_password
S3_BUCKET=cyoa-media

# Minigame HMAC Secret
MINIGAME_SECRET=your-minigame-hmac-secret

# Server
PORT=4000
NODE_ENV=development
```

### Frontend

```bash
cd apps/frontend
cp .env.example .env
```

```env
# API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Optional: Analytics, etc.
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## 4. Docker Szolgáltatások Indítása

Indítsd el a háttérszolgáltatásokat (PostgreSQL, Redis, MinIO):

```bash
# Root könyvtárból
docker-compose up -d
```

Ellenőrzés:

```bash
docker-compose ps
```

Látnod kell:
- `cyoa-postgres` - running
- `cyoa-redis` - running
- `cyoa-minio` - running

### MinIO Hozzáférés

MinIO webUI elérhető: http://localhost:9001

- Username: `minio_admin`
- Password: `minio_password`

Hozd létre a `cyoa-media` bucket-et:

1. Nyisd meg http://localhost:9001
2. Jelentkezz be
3. Menj a "Buckets" menüpontra
4. Kattints a "Create Bucket" gombra
5. Név: `cyoa-media`
6. Kattints "Create"

## 5. Adatbázis Migráció

```bash
cd apps/backend
npm run migrate
```

Ez létrehozza az összes szükséges táblát a PostgreSQL-ben.

### Seed Adatok (Opcionális)

Ha demo történeteket szeretnél betölteni:

```bash
npm run seed
```

Ez létrehoz:
- 1 admin felhasználót (admin@example.com / Admin123!)
- 1 demo játékost (player@example.com / Player123!)
- 2 demo történetet alapvető node-okkal

## 6. Fejlesztői Szerverek Indítása

### Mindkét App Egyszerre (Ajánlott)

```bash
# Root könyvtárból
npm run dev
```

Ez elindítja:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

### Külön-külön

Ha külön terminálokban szeretnéd:

**Backend:**
```bash
cd apps/backend
npm run dev
```

**Frontend:**
```bash
cd apps/frontend
npm run dev
```

## 7. Alkalmazás Elérése

### Frontend

Nyisd meg a böngésződben: http://localhost:3000

**Demo Bejelentkezés:**
- Email: `player@example.com`
- Password: `Player123!`

**Admin Hozzáférés:**
- URL: http://localhost:3000/admin
- Email: `admin@example.com`
- Password: `Admin123!`

### Backend API Docs

Swagger/OpenAPI dokumentáció: http://localhost:4000/api/docs

## 8. Fejlesztés

### Hot Reload

Mindkét app támogatja a hot reload-ot:
- Frontend: Next.js Fast Refresh
- Backend: NestJS watch mode / nodemon

Szerkeszd a fájlokat, és automatikusan újratöltődnek!

### Debugolás

**Backend (VS Code):**

Hozd létre `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/apps/backend",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

**Frontend (Browser DevTools):**

- Chrome DevTools → Sources → localhost:3000
- React DevTools extension ajánlott

## 9. Tesztek Futtatása

### Unit Tesztek

```bash
# Minden app
npm test

# Csak backend
cd apps/backend && npm test

# Csak frontend
cd apps/frontend && npm test

# Watch mode
npm test -- --watch
```

### E2E Tesztek

```bash
npm run test:e2e
```

### Coverage Report

```bash
npm run test:coverage
```

Report elérhető: `coverage/index.html`

## 10. Linting & Formatting

```bash
# Lint check
npm run lint

# Lint fix
npm run lint -- --fix

# Format (Prettier)
npm run format
```

## Gyakori Problémák

### Port Already in Use

Ha a port foglalt:

```bash
# Port 3000 (frontend)
lsof -i :3000
kill -9 <PID>

# Port 4000 (backend)
lsof -i :4000
kill -9 <PID>
```

Vagy változtasd meg a `.env` fájlban.

### Docker Konténerek Nem Indulnak

```bash
# Leállítás
docker-compose down

# Újraindítás
docker-compose up -d --force-recreate

# Logok megtekintése
docker-compose logs -f
```

### Database Connection Error

Ellenőrizd:
1. PostgreSQL konténer fut-e: `docker ps | grep postgres`
2. `DATABASE_URL` helyes-e a `.env`-ben
3. Port 5432 elérhető-e

```bash
# Test connection
docker exec -it cyoa-postgres psql -U cyoa_user -d cyoa_game -c "SELECT 1;"
```

### Migrációs Hiba

```bash
# Reset database
cd apps/backend
npm run migrate:reset

# Re-run migrations
npm run migrate
```

### MinIO Bucket Hiba

Ha a media feltöltés nem működik:

1. Ellenőrizd, hogy létezik-e a `cyoa-media` bucket
2. MinIO konténer fut-e: `docker ps | grep minio`
3. Bucket policy publikus read-re van állítva

## Következő Lépések

Most, hogy a környezeted fut:

1. 📖 Olvasd el a [Story Creation Guide](./story-creation.md)-ot
2. 🏗️ Ismerkedj meg az [Architecture Documentation](../architecture/)-val
3. 🎮 Próbálj ki egy demo történetet
4. 🛠️ Hozd létre az első story-dat az admin felületen!

## Segítség

Ha elakadtál:

- 📚 [Full Documentation](../README.md)
- 💬 [GitHub Discussions](https://github.com/Milcodes/cyoa-adventure-platform/discussions)
- 🐛 [Issue Tracker](https://github.com/Milcodes/cyoa-adventure-platform/issues)

Boldog kódolást! 🚀
