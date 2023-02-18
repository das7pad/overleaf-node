FROM node:18.14.1 AS cache

WORKDIR /overleaf/services/web

COPY docker_cleanup.sh /
COPY package.json package-lock.json ./
COPY frontend/js/packages/react-i18next ./frontend/js/packages/react-i18next

ENV CYPRESS_INSTALL_BINARY=0
RUN /docker_cleanup.sh npm ci

FROM cache as dev

COPY . .
