FROM node:18.14.1

WORKDIR /overleaf/services/web

COPY services/web/docker_cleanup.sh /
COPY services/web/package.json services/web/package-lock.json ./
COPY services/web/frontend/js/packages/react-i18next ./frontend/js/packages/react-i18next

RUN /docker_cleanup.sh npm ci --only=production

COPY services/web/ .
