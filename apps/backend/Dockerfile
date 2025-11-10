# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ========================================
# Stage 2: Builder
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY apps/backend ./apps/backend
COPY tsconfig.json ./

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build the application
RUN npm run build

# ========================================
# Stage 3: Production Runner
# ========================================
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nestjs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package*.json ./apps/backend/

# Copy node_modules/.prisma (generated client)
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Set working directory for the app
WORKDIR /app/apps/backend

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:4000/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
