# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Install openssl for Prisma compatibility
RUN apk add --no-cache openssl openssl-dev libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the app
FROM node:20-alpine AS builder
WORKDIR /app
# Install openssl for Prisma generate
RUN apk add --no-cache openssl openssl-dev libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable telemetry during the build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install openssl required by Prisma at runtime
RUN apk add --no-cache openssl libc6-compat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
