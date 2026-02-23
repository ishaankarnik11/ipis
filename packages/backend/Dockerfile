FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @ipis/backend --filter @ipis/shared

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

# Generate Prisma client
RUN pnpm --filter @ipis/backend db:generate

# Build
RUN pnpm --filter @ipis/backend build

EXPOSE 3000

CMD ["node", "packages/backend/dist/index.js"]
