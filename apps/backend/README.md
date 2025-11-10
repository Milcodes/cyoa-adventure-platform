# CYOA Platform - Backend API

NestJS-based backend for the CYOA Adventure Platform.

## Features

- 🔐 **Authentication** - JWT-based auth with refresh tokens
- 👥 **RBAC** - Role-based access control (player, author, admin, moderator)
- 🗄️ **Database** - PostgreSQL with Prisma ORM
- 🎮 **Game Engine** - Server-side game state management
- 🌍 **Localization** - Multi-language support
- 🛡️ **Security** - bcrypt password hashing, CORS, rate limiting

## Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+ (optional, for caching)
- pnpm/npm/yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed demo data
npm run prisma:seed

# Or run all at once
npm run db:setup
```

### 4. Start Development Server

```bash
npm run start:dev
```

Server will be available at `http://localhost:4000/v1`

## Scripts

```bash
# Development
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with debugger

# Building
npm run build              # Build for production
npm run start:prod         # Start production build

# Database
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:seed        # Seed demo data
npm run prisma:studio      # Open Prisma Studio

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Generate coverage report
npm run test:e2e           # Run e2e tests

# Linting & Formatting
npm run lint               # Run ESLint
npm run format             # Format with Prettier
```

## API Endpoints

### Authentication

- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login user
- `POST /v1/auth/refresh` - Refresh access token
- `GET /v1/auth/me` - Get current user profile
- `POST /v1/auth/me/language` - Update preferred language

### Demo Credentials

```
Player:    player@example.com / password123
Author:    author@example.com / password123
Moderator: moderator@example.com / password123
Admin:     admin@example.com / password123
```

## Project Structure

```
apps/backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── src/
│   ├── api/
│   │   └── auth/              # Auth module
│   │       ├── dto/           # Data Transfer Objects
│   │       ├── strategies/    # Passport strategies
│   │       ├── auth.controller.ts
│   │       ├── auth.service.ts
│   │       ├── auth.service.spec.ts
│   │       └── auth.module.ts
│   ├── common/
│   │   ├── decorators/        # Custom decorators
│   │   ├── guards/            # Auth guards
│   │   └── interfaces/        # Shared interfaces
│   ├── config/
│   │   └── configuration.ts   # App configuration
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts          # Root module
│   └── main.ts                # Application entry
├── test/                      # E2E tests
├── .env.example               # Environment variables template
├── nest-cli.json              # NestJS CLI config
├── package.json
├── tsconfig.json
└── README.md
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Security

- Password hashing with bcrypt (10 rounds)
- JWT tokens (access: 15min, refresh: 7 days)
- CORS enabled for configured origins
- Input validation with class-validator
- RBAC guards for protected endpoints

## Next Steps

- Phase 1.3: Game Engine Core
- Phase 1.4: Gameplay API
- Phase 1.5: Localization API
- Phase 1.6: Moderation API

## License

MIT
