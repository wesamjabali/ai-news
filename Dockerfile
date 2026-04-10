FROM node:22-alpine AS build

RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine

RUN apk add --no-cache libstdc++

WORKDIR /app

COPY --from=build /app/.output .output

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
