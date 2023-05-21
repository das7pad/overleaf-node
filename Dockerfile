FROM node:18.15.0

ENV NODE_ENV=production
WORKDIR /overleaf/services/web

COPY services/web/docker_cleanup.sh /
COPY services/web/package.json services/web/yarn.lock services/web/.yarnrc.yml ./
COPY services/web/frontend/js/packages/react-i18next ./frontend/js/packages/react-i18next

RUN corepack enable
RUN /docker_cleanup.sh yarn plugin import workspace-tools
RUN /docker_cleanup.sh yarn workspaces focus --all --production

COPY services/web/ .
