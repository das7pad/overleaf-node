FROM node:18.15.0

WORKDIR /overleaf/services/web

COPY services/web/docker_cleanup.sh /
COPY services/web/package.json services/web/yarn.lock services/web/.yarnrc.yml ./
COPY services/web/frontend/js/packages/react-i18next/package.json ./frontend/js/packages/react-i18next/package.json

RUN corepack enable
RUN NODE_ENV=production /docker_cleanup.sh yarn install

COPY services/web/ .
