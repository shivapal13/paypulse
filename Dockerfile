# ==========================================
# STAGE 1: Builder (Compile & Prepare Artifacts)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for Docker Layer Caching
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy full application source code
COPY . .

# Generate Prisma Client & Build TypeScript into dist/
RUN npx prisma generate
RUN npm run build

# ==========================================
# STAGE 2: Runner (Minimal Production Image)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests & install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript output from Stage 1
COPY --from=builder /app/dist ./dist
# Copy generated Prisma Client engines & schema from Stage 1
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Expose HTTP Port
EXPOSE 3000

# Start NestJS application in production mode
CMD ["node", "dist/src/main.js"]