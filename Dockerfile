FROM node:14-alpine AS currency-pairs

ARG PORT=7000

ENV PORT=${PORT} IS_DOCKER=true POSTGRES_PASSWORD=uphold POSTGRES_USER=postgres POSTGRES_DB=postgres

WORKDIR /usr/src/app

COPY package*.json dist ./

RUN npm install

EXPOSE ${PORT}