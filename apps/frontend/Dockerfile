# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install libc6-compat for compatibility
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

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
COPY apps/frontend/package*.json ./apps/frontend/

# Install all dependencies
RUN npm install

# Copy source code
COPY apps/frontend ./apps/frontend

# Set working directory
WORKDIR /app/apps/frontend

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

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
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy dependencies from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/apps/frontend/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/next.config.js ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
