# Sonarr Telegram Integration (v1)

Sistema profesional para integrar Telegram con Sonarr, priorizando calidad de código, seguridad y mantenibilidad.

## Stack

- Backend: Node.js + TypeScript
- Framework: Express.js
- DB: (future) SQLite/PostgreSQL
- Telegram: GramJS (`telegram`)
- Queue: BullMQ + Redis
- Testing: Jest
- Docs: TypeDoc
- Logging: Pino

## Quickstart

1. Inicializa entorno: `bun run setup:env` y ajusta `.env`
2. Instala dependencias: `bun install`
3. Build: `bun run build`
4. Desarrollo (hot-reload): `bun run dev:all` (levanta Redis y app)
   - Solo app: `bun run dev`
   - Solo Redis: `bun run dev:up`
5. Producción local: `bun run start`

Docker (dev): `docker compose up --build -d`

## Endpoints

- `GET /api/health` – healthcheck
- `POST /api/queue/enqueue` – encola texto con enlaces (magnet/.torrent)
- `GET /metrics` – métricas Prometheus

## Estructura

- `src/web` – app Express, rutas y middlewares
- `src/shared` – config, logging, errores, métricas, utils
- `src/services/telegram` – cliente GramJS (sesiones encriptadas)
- `src/services/sonarr` – cliente Sonarr con retry
- `src/worker` – cola BullMQ y worker

## Seguridad

- Middlewares: Helmet, CORS, Rate limiting
- Sanitización básica de URLs de entrada
- Sesiones de Telegram encriptadas (AES-256-GCM con `TELEGRAM_ENC_SECRET`)

## Pruebas

`bun run test` ejecuta unit tests (Jest). Cobertura se genera en `coverage/`.

## Roadmap (próximos pasos)

- Persistencia (SQLite/Postgres) con almacenamiento encriptado de credenciales
- CLI de inicialización de sesión MTProto
- Validación robusta de metadatos + priorización de descargas
- Integración Sonarr end-to-end (descargas + monitoreo de estado)
- Autenticación API y autorización por canales permitidos
- CI/CD: publicación de imágenes y análisis de seguridad
