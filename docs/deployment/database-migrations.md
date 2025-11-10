# Database Migrations Guide

This guide explains how to manage database migrations for the CYOA Platform using Prisma.

## Overview

The CYOA Platform uses **Prisma** as its ORM (Object-Relational Mapping) tool. Prisma provides:
- Type-safe database access
- Automatic migration generation
- Database schema versioning
- Easy rollback capabilities

---

## Migration Workflow

### 1. **Development Environment**

When developing locally and making schema changes:

```bash
# Navigate to backend directory
cd apps/backend

# Generate and apply migration
npx prisma migrate dev --name descriptive_migration_name

# This will:
# 1. Create a new migration in prisma/migrations/
# 2. Apply it to your development database
# 3. Regenerate Prisma Client
```

**Example migration names:**
- `add_user_avatar_field`
- `create_comments_table`
- `add_story_tags_relation`

### 2. **Production Deployment**

For production, migrations should be applied during deployment:

```bash
# Apply pending migrations (does NOT create new ones)
npx prisma migrate deploy

# This only runs migrations that haven't been applied yet
# Safe to run multiple times (idempotent)
```

---

## Initial Setup

### For New Databases

If deploying to a fresh database:

```bash
# Apply all migrations
npx prisma migrate deploy

# Seed the database (optional)
npm run seed
```

### For Existing Databases

If you have an existing database without migration history:

```bash
# Mark all migrations as applied without running them
npx prisma migrate resolve --applied "MIGRATION_NAME"

# Or baseline the current schema
npx prisma db push
```

---

## Common Migration Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `prisma migrate dev` | Create and apply migration | Development only |
| `prisma migrate deploy` | Apply pending migrations | Production/CI/CD |
| `prisma migrate status` | Check migration status | Debugging |
| `prisma migrate resolve` | Mark migration as applied/rolled back | Fix migration issues |
| `prisma db push` | Push schema without migration | Prototyping |
| `prisma migrate reset` | Reset database and apply all migrations | Development reset |

---

## Migration Best Practices

### ✅ DO:
1. **Always review generated migrations** before applying
   - Check the SQL in `prisma/migrations/*/migration.sql`
   - Ensure no data loss on column removals

2. **Use descriptive migration names**
   ```bash
   npx prisma migrate dev --name add_story_rating_system
   ```

3. **Test migrations on staging first**
   ```bash
   # On staging
   npx prisma migrate deploy
   npm run test:e2e
   ```

4. **Commit migrations to version control**
   ```bash
   git add prisma/migrations
   git commit -m "feat: add story rating system migration"
   ```

5. **Backup production database before major migrations**
   ```bash
   pg_dump -U cyoa_user -d cyoa_game > backup_$(date +%Y%m%d).sql
   ```

### ❌ DON'T:
1. **Don't edit applied migrations** - create a new migration instead
2. **Don't use `db push` in production** - use proper migrations
3. **Don't skip migration review** - always check the SQL
4. **Don't delete migrations from version control**

---

## Rollback Strategies

### Option 1: Create Reverse Migration
```bash
# Create a new migration that undoes the previous one
npx prisma migrate dev --name rollback_feature_x

# Manually edit the SQL to reverse the changes
```

### Option 2: Restore from Backup
```bash
# Drop the database
psql -U cyoa_user -c "DROP DATABASE cyoa_game;"

# Restore from backup
psql -U cyoa_user -c "CREATE DATABASE cyoa_game;"
psql -U cyoa_user -d cyoa_game < backup_20250110.sql

# Reapply migrations up to the desired point
npx prisma migrate resolve --applied "MIGRATION_TO_KEEP"
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Database Migrations
  run: |
    cd apps/backend
    npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Docker Entrypoint

```bash
#!/bin/sh
# Run migrations before starting the app
npx prisma migrate deploy

# Start the application
node dist/main.js
```

---

## Troubleshooting

### Migration Failed Mid-Execution

```bash
# Check migration status
npx prisma migrate status

# Mark as rolled back if needed
npx prisma migrate resolve --rolled-back "MIGRATION_NAME"

# Fix the issue and retry
npx prisma migrate deploy
```

### Schema Drift Detected

```bash
# Your database schema doesn't match your Prisma schema
# Option 1: Reset development database
npx prisma migrate reset

# Option 2: Push schema changes (prototyping only)
npx prisma db push --force-reset
```

### Multiple Developers

```bash
# After pulling new migrations from Git
npx prisma migrate dev

# This will apply any pending migrations
```

---

## Migration Structure

```
prisma/migrations/
├── 20250110120000_initial_schema/
│   └── migration.sql
├── 20250111140000_add_user_avatar/
│   └── migration.sql
├── 20250112160000_create_comments_table/
│   └── migration.sql
└── migration_lock.toml
```

Each migration folder contains:
- **Timestamp**: YYYYMMDDHHMMSS format
- **Name**: Descriptive identifier
- **migration.sql**: The actual SQL commands

---

## Example Migration Workflow

### Scenario: Add Story Rating System

1. **Update Prisma Schema**
   ```prisma
   model Story {
     // ... existing fields
     rating Float @default(0.0)
     rating_count Int @default(0)
   }

   model StoryRating {
     id String @id @default(cuid())
     story_id String
     user_id String
     rating Int // 1-5 stars
     created_at DateTime @default(now())

     story Story @relation(fields: [story_id], references: [id], onDelete: Cascade)
     user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

     @@unique([story_id, user_id])
   }
   ```

2. **Create Migration**
   ```bash
   npx prisma migrate dev --name add_story_rating_system
   ```

3. **Review Generated SQL**
   ```sql
   -- CreateTable
   CREATE TABLE "StoryRating" (
       "id" TEXT NOT NULL,
       "story_id" TEXT NOT NULL,
       "user_id" TEXT NOT NULL,
       "rating" INTEGER NOT NULL,
       "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

       CONSTRAINT "StoryRating_pkey" PRIMARY KEY ("id")
   );

   -- AlterTable
   ALTER TABLE "Story" ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                        ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

   -- CreateIndex
   CREATE UNIQUE INDEX "StoryRating_story_id_user_id_key" ON "StoryRating"("story_id", "user_id");

   -- AddForeignKey
   ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

   -- AddForeignKey
   ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   ```

4. **Test Locally**
   ```bash
   # Run tests
   npm test

   # Try the feature
   npm run start:dev
   ```

5. **Commit to Git**
   ```bash
   git add prisma/migrations prisma/schema.prisma
   git commit -m "feat: add story rating system"
   git push
   ```

6. **Deploy to Production**
   ```bash
   # CI/CD will run:
   npx prisma migrate deploy
   ```

---

## Health Check

Always verify migration status:

```bash
# Check current migration status
npx prisma migrate status

# Expected output for up-to-date database:
# Database schema is up to date!
```

---

## Emergency Contacts

If you encounter issues:
1. Check Prisma documentation: https://www.prisma.io/docs/concepts/components/prisma-migrate
2. Review migration status: `npx prisma migrate status`
3. Backup before any risky operations
4. Test on staging environment first

---

## Summary

- **Development**: Use `prisma migrate dev` to create and apply migrations
- **Production**: Use `prisma migrate deploy` in CI/CD pipelines
- **Always** review generated SQL before applying
- **Always** backup production database before major changes
- **Always** test migrations on staging first
