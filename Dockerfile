# ──────────────────────────────────────────────────────────────────────────
# Multi-stage Next.js production build.
# Stage 1: install + build the Next app.
# Stage 2: minimal runtime image with the standalone output + static assets.
# ──────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

# Copy the built app (Next 15 default output: .next/) plus runtime needs.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Mount points for user data
RUN mkdir -p uploads data

EXPOSE 3001
CMD ["npm", "start"]
