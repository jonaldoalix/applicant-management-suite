# AMS local/dev image for Dockge (Vite on Node 24)
FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3001
ENV HTTPS=false

EXPOSE 3001

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "3001"]
