FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/.output .output
COPY --from=build /app/node_modules/sql.js node_modules/sql.js

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
