# API + бот (webhook-режим): один контейнер, см. docs/deploy/02-core-services.md
# Node 22 LTS — единый стек со всеми сервисами (media, file-server).
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
