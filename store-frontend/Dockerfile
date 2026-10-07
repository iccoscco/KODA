FROM node:22-alpine
WORKDIR /app

# Dependencias primero (capa cacheable mientras no cambien package*.json).
COPY package*.json ./
RUN npm ci

# Variables NEXT_PUBLIC_* deben existir en build time porque Next las bakea
# dentro del bundle JS. Se pueden sobrescribir con build args desde compose.
ARG NEXT_PUBLIC_APP_URL=/api
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# BACKEND_URL tambien tiene que existir en build time porque next.config.ts lo
# lee al compilar (rewrites quedan horneados en routes-manifest.json).
ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=$BACKEND_URL

# Código y build.
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
