FROM node:18.13.0

WORKDIR /overleaf/services/web

COPY services/web/docker_cleanup.sh /
COPY services/web/package.json services/web/package-lock.json ./

RUN /docker_cleanup.sh npm ci --only=production

COPY services/web/ .
