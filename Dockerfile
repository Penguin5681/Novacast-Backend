# Use official Node.js runtime as base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci && npm cache clean --force
COPY . .
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci && npm cache clean --force
COPY . .

# Ensure TypeScript builds properly and create dist directory
RUN npm run build && \
    ls -la dist/ && \
    echo "Build completed successfully"

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application (ensure dist exists)
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S novacast -u 1001

# Change ownership
RUN chown -R novacast:nodejs /app
USER novacast

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/api/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
