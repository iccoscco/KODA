# Arquitectura migrada — detalles operativos

> Documento complementario del [README.md](README.md). Aquí viven los detalles **operativos** y **narrativos** de la migración `jhemar → jhemar2`. El README sólo concentra la **estructura**, la **topología de red** y el **historial de commits**.

---

## 1. Flujo de datos (nueva arquitectura)

1. El cliente hace request a `https://jhemar.qpsecure.cloud/<path>`.
2. DNS público → IP del servidor → puerto 443 del host → contenedor `nginx-proxy-manager` (NPM global).
3. NPM (proxy_host `9.conf`) resuelve `jhemar2-frontend` por DNS de Docker dentro de `main_npm_network` → contenedor `jhemar2-frontend:3000`.
4. Next.js maneja la request:
   - **Si `<path>` empieza con `/api/...`:** el `rewrites()` de `next.config.ts` reescribe a `${BACKEND_URL}/api/...`. `BACKEND_URL=http://backend:8080` está horneado en el bundle al hacer `next build` (ver Dockerfile parchado, sección 2.2). El Node de Next abre TCP contra `backend:8080` dentro de `jhemar2_store-network` → `jhemar2-backend:8080`.
   - **Si es una ruta de UI:** Next la sirve directamente (SSR/SSG).
5. `jhemar2-backend` (Spring Boot, context-path `/api`) procesa:
   - JPA/Hibernate contra `jhemar2-postgres` (`jdbc:postgresql://postgres:5432/store_db`).
   - Cache/sesiones contra `jhemar2-redis` (`redis:6379`).
   - Uploads de archivos a `/app/uploads/` (volumen `jhemar2_backend_uploads`).
6. La respuesta vuelve por la misma cadena: backend → frontend → NPM global → cliente, sobre TLS.

> Detalle importante: `jhemar2-backend` y `jhemar2-postgres` **no están** en `main_npm_network`. Sólo `jhemar2-frontend` cruza la frontera. El NPM no puede llegar al backend directamente — eso es intencional.

---

## 2. Particularidades de la stack nueva

### 2.1 Eliminación del NPM local de stack

El compose upstream incluía dos contenedores que la versión desplegada **ya no usa**:

```yaml
# Servicios eliminados en /srv/apps/jhemar2/docker-compose.yml
nginx-proxy:        # jc21/nginx-proxy-manager:latest
nginx-proxy-mysql:  # mysql:8 (backing store del panel)
```

Razón técnica:

- El servidor ya corre un **NPM global** (`nginx-proxy-manager`, puertos `0.0.0.0:80/443`) que actúa como único *edge proxy* para todos los subdominios `*.qpsecure.cloud`. Su volumen de datos vive en `/srv/containers/data/nginx-proxy-manager/`.
- El NPM que traía la stack original servía *sólo* como panel administrativo local (mapeado a `127.0.0.1:18181` en la migración previa). No recibía tráfico de internet — había sido neutralizado a loopback porque sus puertos 80/443 chocaban con los del NPM global. Es un componente redundante: cualquier proxy_host que se quisiera crear ahí no sería alcanzable desde fuera.
- Mantenerlo implicaba además correr un **MySQL 8** sólo para persistir su configuración: ~200 MB de imagen + un volumen vivo + un hop de red interno. Coste de mantenimiento sin beneficio.

Consecuencias del cambio (verificadas en `jhemar2_store-network` con `docker network inspect`):

| Antes (`jhemar_store-network`, 6 contenedores) | Ahora (`jhemar2_store-network`, 4 contenedores) |
|---|---|
| `jhemar-postgres` | `jhemar2-postgres` |
| `jhemar-redis` | `jhemar2-redis` |
| `jhemar-backend` | `jhemar2-backend` |
| `jhemar-frontend` | `jhemar2-frontend` |
| `jhemar-nginx-proxy-manager` | — *(eliminado)* |
| `jhemar-nginx-proxy-mysql` | — *(eliminado)* |

El ingreso público sigue siendo el mismo flujo que tenía la stack vieja: el NPM global resuelve el subdominio y reenvía vía DNS de Docker al contenedor del frontend dentro de `main_npm_network` (sección 1).

### 2.2 Parche obligatorio al Dockerfile del frontend

El Dockerfile en `DanLAQP/jhemar@main` **no** declaraba `ARG BACKEND_URL`. Esto hace que `next build` evalúe `process.env.BACKEND_URL` como `undefined` y la rewrite quede horneada apuntando al default `http://127.0.0.1:8080` — lo que en runtime causa `ECONNREFUSED` cuando Next intenta proxy del `/api/*`.

Parche aplicado en `store-frontend/Dockerfile` (commit `94ae72f`):

```dockerfile
ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=$BACKEND_URL
```

Y en `docker-compose.yml` (raíz de `apps/jhemar2/`):

```yaml
    build:
      args:
        BACKEND_URL: ${BACKEND_URL:-http://backend:8080}
```


### 2.3 Rename de servicio para evitar colisión de alias

En `main_npm_network` ya existía un alias DNS `frontend` registrado por la stack legacy (su compose nombra el servicio `frontend`). Si la nueva stack también nombrara el servicio `frontend`, ambos contenedores competirían por el mismo alias y la resolución sería impredecible.

Solución: en `apps/jhemar2/docker-compose.yml` el servicio del frontend se llama `jhemar2_frontend`. El `container_name: jhemar2-frontend` da un destino estable que NPM usa.

### 2.4 Migración de esquema automática

Spring Boot está configurado con `spring.jpa.hibernate.ddl-auto=update`. Al arrancar `jhemar2-backend` contra el dump restaurado, Hibernate detectó las nuevas columnas que introdujo el refactor y las creó automáticamente en `store_config`:

```text
printer_ip    | varchar(255)
printer_name  | varchar(255)
printer_port  | integer
printer_type  | varchar(255)
```

No hubo cambios destructivos en columnas existentes ni en datos.

### 2.5 Datos restaurados desde el dump

Volcado verificado tras el restore:

| Tabla | Filas |
|---|---|
| `users` | 1 |
| `roles` | 1 |
| `products` | 171 |
| `orders` | 111 |

Esquema completo (21 tablas) reconstruido del SQL — ver lista en `JHEMAR_INFRA.md` sección 6.1.

---

## 3. Acciones ejecutadas en la migración

Resumen cronológico de todo lo aplicado para llevar la stack vieja al estado actual. Cada acción es idempotente o trazable a archivos concretos.

| # | Acción | Detalle técnico | Verificación |
|---|---|---|---|
| 1 | Copia del código | Código fuente en `/srv/apps/jhemar2/jhemar/` | `ls /srv/apps/jhemar2/jhemar/` |
| 2 | Dump de Postgres legacy | `pg_dump -U postgres -d store_db --clean --if-exists --no-owner --no-privileges` desde `jhemar-postgres`; output a `/srv/apps/jhemar2/data_base/jhemar2/store_db_20260529_032321Z.sql` (~129 KB, 21 tablas) | `wc -l`, `grep CREATE TABLE` |
| 3 | Compose nuevo | `/srv/apps/jhemar2/docker-compose.yml`: 4 servicios (`postgres`, `redis`, `backend`, `jhemar2_frontend`), 2 redes (`store-network` privada + `main_npm_network` externa), volumen `postgres_data` y `backend_uploads` | `docker compose config --quiet` |
| 4 | Build images | `docker compose build` produjo `jhemar2-backend:latest` (Java 21 + Spring 4.0.3) y `jhemar2-jhemar2_frontend:latest` (Node 22 + Next 16.1.6) | `docker images` |
| 5 | Restore del dump | `psql -U postgres -d store_db < /dumps/store_db_*.sql` dentro de `jhemar2-postgres` (volumen `./data_base/jhemar2` montado read-only en `/dumps`) | `\dt` → 21 tablas; SELECT count → 1 user, 1 role, 171 products, 111 orders |
| 6 | Migración de esquema | Spring `ddl-auto: update` aplicado al arrancar `jhemar2-backend`: Hibernate añadió `printer_ip`, `printer_name`, `printer_port`, `printer_type` a `store_config` sin DDL manual | `\d store_config` |
| 7 | Migración de uploads | `docker cp jhemar-backend:/app/uploads/. → host tmpdir → jhemar2-backend:/app/uploads/`. 2 archivos transferidos: `avatars/avatar_1_1777760955364.png`, `logos/store_logo_1777760944711.png` (584 KB) | `curl -sI https://jhemar.qpsecure.cloud/api/uploads/logos/store_logo_1777760944711.png` → HTTP/2 200 |
| 8 | Eliminación NPM local | Servicios `nginx-proxy` + `nginx-proxy-mysql` no replicados en el compose nuevo. El NPM global del servidor (`nginx-proxy-manager`) maneja todo el ingress | `docker network inspect jhemar2_store-network` → 4 contenedores |
| 9 | Rename de servicio frontend | Service name pasa de `frontend` a `jhemar2_frontend` en el compose nuevo para no chocar con el alias DNS `frontend` que la stack legacy registra en `main_npm_network`. `container_name: jhemar2-frontend` queda como target estable | `docker exec nginx-proxy-manager getent hosts jhemar2-frontend` |
| 10 | Patch Dockerfile | Añadidos `ARG BACKEND_URL=http://backend:8080` + `ENV BACKEND_URL=$BACKEND_URL` antes de `RUN npm run build` para que `next.config.ts` lea la URL correcta a build-time (sin el patch, `routes-manifest.json` quedaba con `http://127.0.0.1:8080` → `ECONNREFUSED` en `/api/*`) | `docker logs jhemar2-frontend \| grep ECONN` → vacío |
| 11 | Switch del proxy_host | `/srv/containers/data/nginx-proxy-manager/data/nginx/proxy_host/9.conf`: `set $server "frontend"` → `set $server "jhemar2-frontend"` (puerto `3000` sin cambios). `nginx -t && nginx -s reload` aplicó en caliente | `tail /data/logs/proxy-host-9_access.log` → `[Sent-to jhemar2-frontend]` |
| 12 | Backup pre-switch | Copia del `9.conf` previo a `/srv/apps/jhemar2/data_base/jhemar2/9.conf.pre-jhemar2.bak` antes del paso 11 | `ls -la /srv/apps/jhemar2/data_base/jhemar2/9.conf.pre-jhemar2.bak` |
| 13 | Usuario de prueba | `INSERT INTO users (...) VALUES ('admin2', 'admin2@store.local', '$2a$10$...', 1, true, 0, NOW(), NOW())` con hash bcrypt del cost 10 del PasswordEncoder default de Spring | `POST /api/auth/login` → HTTP 200 + JWT |
| 14 | Verificación end-to-end | Pruebas en `https://jhemar.qpsecure.cloud/`: `/login` → 200; `/api/v3/api-docs` → 200; `/api/uploads/...` → 200; usuarios reales en logs (`38.250.157.124`) navegando sin errores | `curl -sI`, `docker exec nginx-proxy-manager tail /data/logs/proxy-host-9_access.log` |

---

## 4. Operación

### Levantar la stack nueva

```bash
cd /srv/apps/jhemar2
docker compose up -d
```

### Reiniciar / rebuild puntual

```bash
cd /srv/apps/jhemar2
docker compose build jhemar2_frontend
docker compose up -d jhemar2_frontend
```

### Logs

```bash
docker logs --tail 200 jhemar2-frontend
docker logs --tail 200 jhemar2-backend
docker logs --tail 200 jhemar2-postgres
```

### Estado

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep '^jhemar'
```

### Verificación pública

```bash
curl -sI https://jhemar.qpsecure.cloud/
curl -sI https://jhemar.qpsecure.cloud/api/v3/api-docs
docker exec nginx-proxy-manager tail -5 /data/logs/proxy-host-9_access.log
```

El log debe mostrar `[Sent-to jhemar2-frontend]` para tráfico nuevo.

---

## 5. Cierre de la migración (cuando jhemar2 esté estable)

Pasos sugeridos cuando ya no se quiera mantener la stack legacy:

1. Confirmar que hay backup actualizado del Postgres legacy.
2. `docker compose -f /srv/containers/projects/jhemar/jhemar/jhemar/docker-compose.yml down` (mantiene volúmenes).
3. Mover (no borrar) `/srv/containers/projects/jhemar/jhemar/jhemar/` → `/srv/backups/jhemar_legacy_$(date -u +%Y%m%d)/` por si se necesita auditoría.
4. Eliminar el NPM local de la stack legacy: `docker compose rm jhemar-nginx-proxy jhemar-nginx-proxy-mysql`.
5. Borrar los volúmenes legacy una vez verificada la migración: `docker volume rm jhemar_postgres_data jhemar_backend_uploads jhemar_mysql_data` (CUIDADO — destructivo).
6. Actualizar `/srv/ESTRUCTURA_DETALLADA.md` para marcar la entrada de jhemar como migrada a `/srv/apps/jhemar2/`.
