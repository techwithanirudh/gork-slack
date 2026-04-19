FROM oven/bun:1 AS base
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

RUN mkdir -p logs && chown -R bun:bun /usr/src/app
ENV NODE_ENV=production
USER bun
CMD ["bun", "server/index.ts"]
