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
3. Levanta infraestructura dev: `bun run dev:up` (Redis + MariaDB)
4. Migraciones en dev: `bun run db:migrate:dev`
5. Desarrollo (hot-reload): `bun run dev`
6. Producción local: `bun run build` y `bun run start`

Docker (dev): `docker compose up --build -d`

## Endpoints / URLs

- Base: `http://localhost:3000` (configurable con `PORT`)
- `GET /api/health`: estado del servicio (JSON)
- `GET /api/health/metrics`: métricas Prometheus desde health
- `GET /metrics`: métricas Prometheus (texto)
- `POST /api/queue/enqueue`: encola texto; extrae enlaces magnet/.torrent
  - Body: `{ "text": "...", "source": "api"? }`
  - Respuesta: `202 { "accepted": <n> }` o `400` si no hay enlaces
  - Nota: rate limiting activo en `/api/*`

### Telegram (login web)

- `GET /api/telegram/status`: estado de configuración y sesión
- `POST /api/telegram/login/start`: inicia login MTProto vía teléfono
  - Body: `{ "phone": "+34123456789" }`
  - Respuesta: `{ "loginId": "...", "type": "code", "next": "verify" }`
- `POST /api/telegram/login/verify`: verifica el código recibido
  - Body: `{ "loginId": "...", "code": "12345" }`
  - Respuesta: `{ "status": "ok" }` o `{ "status": "2fa_required", "next": "2fa" }`
- `POST /api/telegram/login/2fa`: confirma contraseña de dos factores (si aplica)
  - Body: `{ "loginId": "...", "password": "mi-contraseña" }`
  - Respuesta: `{ "status": "ok" }`
- `POST /api/telegram/logout`: borra la sesión guardada

UI en `apps/web` disponible en la ruta `/telegram` para completar todo el flujo vía web.

## Estructura

- `src/web` – app Express, rutas y middlewares
- `src/shared` – config, logging, errores, métricas, utils
- `src/shared/db` – pool MariaDB, migraciones y repositorios
- `src/services/telegram` – cliente GramJS (sesiones encriptadas)
- `src/services/sonarr` – cliente Sonarr con retry
- `src/worker` – cola BullMQ y worker

## Seguridad

- Middlewares: Helmet, CORS, Rate limiting
- Sanitización básica de URLs de entrada
- Sesiones de Telegram encriptadas (AES-256-GCM con `TELEGRAM_ENC_SECRET`)

## Configuración requerida

- `TELEGRAM_API_ID` y `TELEGRAM_API_HASH`: credenciales de tu app de Telegram
- `TELEGRAM_ENC_SECRET`: secreto de al menos 16 chars para cifrar la sesión
- `CORS_ORIGIN`: origen permitido para la UI (por ejemplo `http://localhost:5173`)
- Web UI: define `VITE_API_BASE` apuntando al backend Express (por ejemplo `http://localhost:3000`)

## Pruebas

`bun run test` ejecuta unit tests (Jest). Cobertura se genera en `coverage/`.

## Roadmap (próximos pasos)

- Persistencia (MariaDB) con almacenamiento encriptado de credenciales
- CLI de inicialización de sesión MTProto
- Validación robusta de metadatos + priorización de descargas
- Integración Sonarr end-to-end (descargas + monitoreo de estado)
- Autenticación API y autorización por canales permitidos
- CI/CD: publicación de imágenes y análisis de seguridad
