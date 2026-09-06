# Production Dockerfile for FitCore NestJS API
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

# Copy root configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY services/api/ ./services/api/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Generate Prisma Client & Build
WORKDIR /app/services/api
RUN pnpm prisma generate
RUN pnpm build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/node_modules ./services/api/node_modules
COPY --from=builder /app/services/api/prisma ./prisma
COPY --from=builder /app/packages ./packages

EXPOSE 4000

CMD ["node", "dist/main.js"]
