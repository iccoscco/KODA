# jhemar — Tienda Virtual

Aplicación de tienda (POS + gestión) compuesta por:

- **Backend** Spring Boot 4.0.3 / Java 21 — `store-backend/`
- **Frontend** Next.js 16 / React 19 / MUI — `store-frontend/`
- **PostgreSQL 18**, **Redis 7**
- Subdominio público en producción: `https://jhemar.qpsecure.cloud`

> Este README sólo cubre **estructura del proyecto**, **topología de red** e **historial de commits** de la migración.
> Los detalles operativos (flujo de datos, particularidades de la stack, acciones ejecutadas, operación y cierre) viven en [arquitectura_migrada.md](arquitectura_migrada.md).

---

## 1. Estado del despliegue (2026-05-29)

El servidor mantiene **dos stacks en paralelo**:

| Stack | Origen del código | Contenedores | Postgres | Tráfico real |
|---|---|---|---|---|
| **`jhemar` (legacy)** | `/srv/containers/projects/jhemar/jhemar/jhemar/` (snapshot del 2026-05-21) | `jhemar-postgres`, `jhemar-redis`, `jhemar-backend`, `jhemar-frontend`, `jhemar-nginx-proxy-manager`, `jhemar-nginx-proxy-mysql` | volumen `jhemar_postgres_data` | **NO** (NPM ya no apunta aquí) |
| **`jhemar2` (activa)** | `/srv/apps/jhemar2/jhemar/` (clon de `DanLAQP/jhemar@e280fad`) | `jhemar2-postgres`, `jhemar2-redis`, `jhemar2-backend`, `jhemar2-frontend` | volumen `jhemar2_postgres_data` (restaurado desde dump) | **SÍ** — recibe `https://jhemar.qpsecure.cloud` |

---

## 2. Topología de red previa (stack `jhemar`)

```text
                        Internet (80/443)
                                │
                                ▼
                ┌───────────────────────────────┐
                │  nginx-proxy-manager (global) │
                │  proxy_host 9.conf            │
                │  set $server "frontend";      │   ← alias DNS en main_npm_network
                │  set $port   3000;            │
                └───────────────┬───────────────┘
                                │  main_npm_network
                                ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │                  jhemar_store-network (bridge, privada)             │
   │                                                                     │
   │   ┌──────────────┐    /api    ┌──────────────┐     JDBC   ┌──────────────┐
   │   │ jhemar-      │──────────► │ jhemar-      │───────────►│ jhemar-      │
   │   │  frontend    │ rewrites   │  backend     │ store_db   │  postgres    │
   │   │ (Next 16)    │            │ (Spring 4)   │            │ (PG 18)      │
   │   │ expose 3000  │            │ expose 8080  │            │ expose 5432  │
   │   └──────────────┘            └──────┬───────┘            └──────────────┘
   │                                      ▼
   │                              ┌──────────────┐
   │                              │ jhemar-redis │
   │                              └──────────────┘
   │
   │   ┌────────────────────────┐     ┌──────────────────────────┐
   │   │ jhemar-nginx-proxy-mgr │────►│ jhemar-nginx-proxy-mysql │
   │   │ (panel local, 127.0.0  │     │ (MySQL 8 backing NPM)    │
   │   │  .1:18181 → 81)        │     └──────────────────────────┘
   │   └────────────────────────┘
   └────────────────────────────────────────────────────────────────────┘
```

Notas:

- Único contenedor expuesto a `main_npm_network`: `jhemar-frontend`.
- El NPM local (`jhemar-nginx-proxy-manager`) sirve sólo como panel administrativo en loopback.

---

## 3. Topología de red nueva (stack `jhemar2`)

```text
                        Internet (80/443)
                                │
                                ▼
                ┌────────────────────────────────────┐
                │   nginx-proxy-manager (global)     │
                │   proxy_host 9.conf                │
                │   set $server "jhemar2-frontend";  │   ← container_name explícito
                │   set $port   3000;                │
                └────────────────┬───────────────────┘
                                 │  main_npm_network
                                 ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                  jhemar2_store-network (bridge, privada)             │
   │                                                                      │
   │   ┌───────────────┐    /api   ┌───────────────┐    JDBC   ┌────────────────┐
   │   │ jhemar2-      │─────────► │ jhemar2-      │──────────►│ jhemar2-       │
   │   │  frontend     │ rewrites  │  backend      │ store_db  │  postgres      │
   │   │ (Next 16)     │           │ (Spring 4)    │           │ (PG 18 +       │
   │   │ expose 3000   │           │ expose 8080   │           │  dump restored)│
   │   └───────────────┘           └──────┬────────┘           └────────────────┘
   │                                      ▼
   │                              ┌───────────────┐
   │                              │ jhemar2-redis │
   │                              └───────────────┘
   └─────────────────────────────────────────────────────────────────────┘

   (Sin NPM local de stack — el panel administrativo se elimina del scope nuevo.)
```

### Diagrama del cambio (antes → ahora)

```text
                Internet → nginx-proxy-manager (sin cambios)
                                │
              ┌─────────────────┼─────────────────┐
              │  ANTES                              │  AHORA
              │  9.conf: $server "frontend";        │  9.conf: $server "jhemar2-frontend";
              │  resolución por service-alias       │  resolución por container_name
              ▼                                     ▼
   ┌──────────────────┐               ┌──────────────────────┐
   │ jhemar-frontend  │ (sigue arriba │ jhemar2-frontend     │ ←─ tráfico real
   │ jhemar-backend   │  para rollback│ jhemar2-backend      │
   │ jhemar-postgres  │  inmediato)   │ jhemar2-postgres     │ ←─ dump 2026-05-29 restaurado
   │ jhemar-redis     │               │ jhemar2-redis        │    + Hibernate añade columnas
   │ jhemar-nginx-... │               │                      │      printer_* en store_config
   └──────────────────┘               └──────────────────────┘
   red: jhemar_store-network          red: jhemar2_store-network
```

### Tabla comparativa de cambios

| Aspecto | Antes (`jhemar`) | Ahora (`jhemar2`) |
|---|---|---|
| Compose root | `/srv/containers/projects/jhemar/jhemar/jhemar/docker-compose.yml` | `/srv/apps/jhemar2/docker-compose.yml` |
| Fuente del código | snapshot manual | copia del código en `/srv/apps/jhemar2/jhemar/` |
| Container names | `jhemar-*` | `jhemar2-*` |
| Red interna | `jhemar_store-network` | `jhemar2_store-network` |
| NPM target | `frontend:3000` (alias de servicio) | `jhemar2-frontend:3000` (container_name explícito) |
| Postgres data | volumen `jhemar_postgres_data` | volumen nuevo `jhemar2_postgres_data` restaurado desde dump |
| Uploads | bind a `./store-backend/uploads/` | volumen `jhemar2_backend_uploads` |
| NPM local de stack | sí (`jhemar-nginx-proxy-manager` + MySQL) | **eliminado** |
| Service name del frontend en compose | `frontend` | `jhemar2_frontend` (evita colisión de alias en `main_npm_network`) |
| Esquema BD | sin columnas de impresora | Hibernate `ddl-auto: update` añadió `printer_ip`, `printer_name`, `printer_port`, `printer_type` a `store_config` |

---

## 4. Estructura en disco

```text
/srv/apps/jhemar2/
├── docker-compose.yml          ← compose de la stack activa (jhemar2)
├── .env                        ← secretos
├── jhemar/                     ← clon de DanLAQP/jhemar
│   ├── store-backend/          ← Java/Spring
│   ├── store-frontend/         ← Next.js
│   ├── docker-compose.yml      ← compose UPSTREAM (no usado — referencial)
│   ├── README.md               ← este archivo (estructura + topología + commits)
│   └── arquitectura_migrada.md ← detalles operativos de la migración
├── data_base/jhemar2/
│   ├── store_db_20260529_032321Z.sql      ← dump del legacy, fuente de verdad inicial
│   ├── store_db_20260529_032321Z.sql.gz
│   └── 9.conf.pre-jhemar2.bak             ← copia de NPM 9.conf antes del switch
├── configs/                                ← snapshot de configs legacy (auditoría)
├── JHEMAR_INFRA.md                        ← documento de infra legacy
└── jhemar2.md                              ← plan de migración detallado
```

Stack legacy intacta en:

```text
/srv/containers/projects/jhemar/jhemar/jhemar/   ← snapshot 2026-05-21 (sin tráfico)
```

NPM global:

```text
/srv/containers/data/nginx-proxy-manager/data/nginx/proxy_host/9.conf
```

---

## 5. Operación rápida

### Rutas de trabajo

| Ruta | Qué es |
|---|---|
| `/srv/apps/jhemar2/` | Working dir del compose (todos los comandos abajo asumen estar aquí) |
| `/srv/apps/jhemar2/docker-compose.yml` | Compose activo (4 servicios) |
| `/srv/apps/jhemar2/.env` | Secretos (DB, JWT, superadmin) |
| `/srv/apps/jhemar2/jhemar/` | Código fuente (código fuente de la app) |
| `/srv/apps/jhemar2/jhemar/store-backend/` | Build context backend (Java 21 + Spring 4.0.3) |
| `/srv/apps/jhemar2/jhemar/store-frontend/` | Build context frontend (Node 22 + Next 16.1.6) |
| `/srv/apps/jhemar2/data_base/jhemar2/` | Dump SQL + backup del proxy_host previo |
| `/srv/containers/data/nginx-proxy-manager/data/nginx/proxy_host/9.conf` | Config NPM global para `jhemar.qpsecure.cloud` |
| Volumen Docker `jhemar2_postgres_data` | Datos persistentes de Postgres |
| Volumen Docker `jhemar2_backend_uploads` | Subidas (logos, avatares) servidas por backend |

### Levantar el servicio (primera vez o tras `down`)

```bash
cd /srv/apps/jhemar2
docker compose up -d
```

Verificación inmediata:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep '^jhemar2-'
curl -sI https://jhemar.qpsecure.cloud/
```

### Rebuild (cuando cambia código en `jhemar/store-backend/` o `jhemar/store-frontend/`)

```bash
cd /srv/apps/jhemar2

# Sólo backend
docker compose build backend && docker compose up -d backend

# Sólo frontend
docker compose build jhemar2_frontend && docker compose up -d jhemar2_frontend

# Ambos
docker compose build && docker compose up -d
```

> El build del frontend pasa `BACKEND_URL` como build-arg para que Next hornee el rewrite correcto (ver [arquitectura_migrada.md §2.2](arquitectura_migrada.md)).

### Reboot de contenedores (reiniciar sin rebuild)

```bash
cd /srv/apps/jhemar2

# Reiniciar uno
docker compose restart backend
docker compose restart jhemar2_frontend
docker compose restart postgres
docker compose restart redis

# Reiniciar todo
docker compose restart
```

### Detener / arrancar sin perder datos

```bash
cd /srv/apps/jhemar2
docker compose stop          # detener todos los contenedores (volúmenes intactos)
docker compose start         # arrancarlos otra vez
```

### Bajar todo (mantiene volúmenes)

```bash
cd /srv/apps/jhemar2
docker compose down          # elimina contenedores y red, conserva volúmenes
```

> Para borrar también volúmenes: `docker compose down -v` (**destructivo** — borra DB y uploads).

### Logs

```bash
docker logs --tail 200 -f jhemar2-frontend
docker logs --tail 200 -f jhemar2-backend
docker logs --tail 200 jhemar2-postgres
docker logs --tail 200 jhemar2-redis
```

### Tráfico real entrante (vía NPM global)

```bash
docker exec nginx-proxy-manager tail -f /data/logs/proxy-host-9_access.log
```

El upstream activo debe leerse como `[Sent-to jhemar2-frontend]`.

### Acceso directo a la BD

```bash
docker exec -it jhemar2-postgres psql -U postgres -d store_db
```

---

## 6. Cambios de infraestructura

Cambios que no viven en este repo (porque son operacionales del servidor, no del código de la app):

| Recurso | Cambio |
|---|---|
| `/srv/apps/jhemar2/docker-compose.yml` | Compose nuevo con 4 servicios (`postgres`, `redis`, `backend`, `jhemar2_frontend`), volúmenes `postgres_data` + `backend_uploads`, sin NPM local |
| `/srv/apps/jhemar2/.env` | Reuso de secretos del `.env` legacy para que el dump descifre y los JWT sigan válidos |
| `/srv/containers/data/nginx-proxy-manager/data/nginx/proxy_host/9.conf` | `set $server "frontend"` → `set $server "jhemar2-frontend"`; `nginx -s reload` aplicado |
| `/srv/apps/jhemar2/data_base/jhemar2/store_db_20260529_032321Z.sql` | Dump base de datos legacy (fuente de verdad inicial para jhemar2-postgres) |
| `/srv/apps/jhemar2/data_base/jhemar2/9.conf.pre-jhemar2.bak` | Backup del proxy_host previo al switch |
| Postgres legacy `jhemar-postgres` | Sin cambios — mantenido vivo para auditoría |

---

## 7. Referencias

- Detalles operativos de la migración: [arquitectura_migrada.md](arquitectura_migrada.md)
- Plan completo de migración: [/srv/apps/jhemar2/jhemar2.md](../jhemar2.md)
- Topología legacy documentada: [/srv/apps/jhemar2/JHEMAR_INFRA.md](../JHEMAR_INFRA.md)
- Compose activo: [/srv/apps/jhemar2/docker-compose.yml](../docker-compose.yml)
- NPM proxy host de jhemar: [/srv/containers/data/nginx-proxy-manager/data/nginx/proxy_host/9.conf](../../../containers/data/nginx-proxy-manager/data/nginx/proxy_host/9.conf)
