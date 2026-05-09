ARG NODE_VERSION=20-bookworm-slim
FROM node:${NODE_VERSION} AS base
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# === Pruner stage ===
FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx -y turbo@2 prune @jeu-soiree/server --docker

# === Installer stage ===
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# === Runner stage ===
FROM base AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs --create-home colyseus
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN mkdir -p /app/apps/server/data && chown -R colyseus:nodejs /app/apps/server/data
USER colyseus
ENV NODE_ENV=production
ENV PORT=2567
ENV DB_PATH=/app/apps/server/data/jeu-soiree.db
EXPOSE 2567
WORKDIR /app/apps/server
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
