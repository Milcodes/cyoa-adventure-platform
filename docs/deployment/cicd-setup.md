# CI/CD Setup Guide

This guide explains how the Continuous Integration and Continuous Deployment pipelines work for the CYOA Platform.

## Overview

The CYOA Platform uses **GitHub Actions** for CI/CD with two main workflows:

1. **CI Workflow** (`ci.yml`) - Runs on every push and PR
2. **CD Workflow** (`cd.yml`) - Deploys to staging/production

---

## CI Workflow (Continuous Integration)

### Triggers
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Jobs

#### 1. Backend Lint
- ESLint code quality check
- Prettier format validation

#### 2. Backend Tests
- Unit tests with Jest
- Integration tests with test database
- Coverage report upload to Codecov

#### 3. Backend Build
- TypeScript compilation
- Prisma Client generation
- Build verification

#### 4. Frontend Lint
- ESLint code quality check
- TypeScript type checking

#### 5. Frontend Build
- Next.js production build
- Build output verification

#### 6. Docker Build
- Multi-stage Docker image build
- Build cache optimization
- Backend & Frontend images

#### 7. Security Scan
- Trivy vulnerability scanner
- Dependency audit
- SARIF report to GitHub Security

---

## CD Workflow (Continuous Deployment)

### Triggers
- Automatic: Push to `main` branch → deploys to **staging**
- Manual: Workflow dispatch → choose staging or **production**

### Deployment Flow

```
┌─────────────┐
│   Build &   │
│  Push Images│
└──────┬──────┘
       │
       ├──────────────┐
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│   Deploy    │  │   Deploy    │
│  to Staging │  │ to Production│
└─────────────┘  └─────────────┘
       │              │
       ▼              ▼
   ┌────────────────────┐
   │   Notifications    │
   └────────────────────┘
```

### Staging Deployment
1. Build & push Docker images
2. SSH to staging server
3. Pull new images
4. Run database migrations
5. Restart services with new images
6. Run smoke tests

### Production Deployment
1. Requires manual approval (GitHub Environment)
2. Backup production database
3. Rolling restart (zero-downtime)
4. Run smoke tests
5. Send notifications (Slack, etc.)

---

## Required Secrets

Configure these secrets in GitHub repository settings:

### General
```
GITHUB_TOKEN (automatic)
```

### Staging Environment
```
STAGING_HOST          # staging.cyoa-platform.dev
STAGING_USER          # deploy user
STAGING_SSH_KEY       # SSH private key
```

### Production Environment
```
PROD_HOST             # cyoa-platform.dev
PROD_USER             # deploy user
PROD_SSH_KEY          # SSH private key
```

### Application Secrets
```
NEXT_PUBLIC_API_URL   # Frontend API URL
SLACK_WEBHOOK_URL     # (Optional) For notifications
```

---

## Server Setup

### Prerequisites on deployment servers:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Create deployment directory
sudo mkdir -p /opt/cyoa-platform
sudo chown $USER:$USER /opt/cyoa-platform

# Clone repository
cd /opt/cyoa-platform
git clone https://github.com/your-org/cyoa-platform.git .

# Create environment file
cp .env.production.example .env.production
nano .env.production  # Fill in production values
```

### SSH Key Setup

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/cyoa_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/cyoa_deploy.pub deploy@your-server.com

# Add private key to GitHub Secrets
cat ~/.ssh/cyoa_deploy  # Copy this to STAGING_SSH_KEY or PROD_SSH_KEY
```

---

## Manual Deployment

### Deploy to Staging
```bash
# Via GitHub UI
Actions → CD - Continuous Deployment → Run workflow
Environment: staging
```

### Deploy to Production
```bash
# Via GitHub UI (requires approval)
Actions → CD - Continuous Deployment → Run workflow
Environment: production
```

### Via GitHub CLI
```bash
# Install gh CLI
brew install gh  # macOS
# or
sudo apt install gh  # Linux

# Deploy to staging
gh workflow run cd.yml -f environment=staging

# Deploy to production (requires manual approval)
gh workflow run cd.yml -f environment=production
```

---

## Environment Protection Rules

### Staging
- No required reviewers
- Auto-deploy on main branch push

### Production
- **Required reviewers**: 1-2 team members
- **Wait timer**: Optional (e.g., 5 minutes)
- **Manual trigger only**

Configure in: `Settings → Environments → production → Protection rules`

---

## Rollback Strategy

### Option 1: Redeploy Previous Version
```bash
# Find previous successful deployment
git log --oneline

# Checkout that commit
git checkout <commit-hash>

# Trigger deployment
git push origin <commit-hash>:main --force

# Or use GitHub UI to redeploy
```

### Option 2: Database Rollback
```bash
# SSH to server
ssh deploy@your-server.com

# List backups
ls -lh /backups/

# Restore backup
docker exec -i cyoa-postgres-prod psql -U cyoa_user cyoa_game < /backups/backup_20250110_143000.sql

# Restart services
cd /opt/cyoa-platform
docker-compose -f docker-compose.prod.yml restart
```

---

## Monitoring & Alerts

### Health Checks
- Backend: `https://api.cyoa-platform.dev/v1/health`
- Frontend: `https://cyoa-platform.dev`

### Slack Notifications
```yaml
# Already configured in cd.yml
- Deployment started
- Deployment success
- Deployment failure
```

### Custom Monitoring
Add monitoring tools:
- **Sentry** for error tracking
- **DataDog** for APM
- **Prometheus + Grafana** for metrics

---

## Troubleshooting

### Build Fails
```bash
# Check CI logs
# Usually:
# - Lint errors → fix code
# - Test failures → fix tests
# - Build errors → check TypeScript
```

### Deployment Fails
```bash
# SSH to server
ssh deploy@your-server.com

# Check Docker logs
docker logs cyoa-backend-prod
docker logs cyoa-frontend-prod

# Check service status
docker ps -a

# Check disk space
df -h
```

### Migration Fails
```bash
# SSH to server
docker exec -it cyoa-backend-prod bash

# Check migration status
npx prisma migrate status

# Resolve if needed
npx prisma migrate resolve --applied "migration_name"
```

---

## Performance Optimization

### Docker Build Cache
```yaml
# Already configured in workflows
cache-from: type=gha
cache-to: type=gha,mode=max
```

### Parallel Jobs
```yaml
# CI runs jobs in parallel
- backend-lint
- backend-test
- frontend-lint
# All run simultaneously
```

### Incremental Builds
- Only rebuilds changed layers
- Leverages Docker BuildKit
- ~70% faster builds

---

## Security Best Practices

### ✅ Implemented
- Non-root Docker containers
- Secret scanning (Trivy)
- SARIF reports to GitHub Security
- SSH key authentication
- Environment-based secrets

### 🔄 Recommended
- Rotate secrets every 90 days
- Enable branch protection rules
- Require signed commits
- Set up security alerts
- Regular dependency updates

---

## Example: Full Deployment Flow

```bash
# 1. Developer creates PR
git checkout -b feature/new-rating-system
git push origin feature/new-rating-system

# 2. CI runs automatically
# ✅ Lint
# ✅ Tests
# ✅ Build
# ✅ Security scan

# 3. Code review & merge to main
# PR approved → Merge

# 4. CD triggers (staging)
# ✅ Build images
# ✅ Deploy to staging
# ✅ Run smoke tests

# 5. Manual production deployment
# GitHub UI → Run workflow → production
# ✅ Requires approval
# ✅ Database backup
# ✅ Zero-downtime deploy
# ✅ Notifications sent

# 6. Monitor
# Check health endpoints
# Review Slack notifications
# Monitor error rates
```

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| View CI status | GitHub → Actions → CI workflow |
| Deploy to staging | Automatic on merge to main |
| Deploy to production | Actions → CD workflow → Manual trigger |
| Check deployment logs | Actions → CD workflow → Job logs |
| Rollback | Redeploy previous commit or restore backup |
| View health | `curl https://api.cyoa-platform.dev/v1/health` |

---

## Support

For issues with CI/CD:
1. Check workflow logs in GitHub Actions
2. Review error messages
3. SSH to server and check Docker logs
4. Consult deployment documentation
5. Contact DevOps team

---

## Summary

- **CI** runs on every push/PR (lint, test, build, security)
- **CD** deploys to staging automatically, production manually
- **Zero-downtime** deployments with rolling restarts
- **Automatic backups** before production deployments
- **Environment protection** with required approvals
- **Notifications** via Slack for deployment status
