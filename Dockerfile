# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* tsconfig.base.json ./
COPY web/package.json web/
COPY server/package.json server/
RUN npm install --workspaces --include-workspace-root
COPY web ./web
COPY server ./server
RUN npm --workspace web run build
RUN npm --workspace server run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/arcade.db
ENV WEB_DIST=/app/web/dist
RUN mkdir -p /data
COPY --from=build /app/server/package.json /app/server/package.json
COPY --from=build /app/server/dist /app/server/dist
COPY --from=build /app/web/dist /app/web/dist
COPY --from=build /app/node_modules /app/node_modules
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server/dist/server.js"]
