FROM node:18.13.0 AS cache

WORKDIR /overleaf/services/web

COPY docker_cleanup.sh /
COPY package.json package-lock.json ./

ENV CYPRESS_INSTALL_BINARY=0
RUN /docker_cleanup.sh npm ci

FROM cache as dev

COPY . .
