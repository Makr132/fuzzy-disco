FROM node:18-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

RUN bun run build

ENV NODE_ENV production

EXPOSE 3000

CMD ["bun", "start"]