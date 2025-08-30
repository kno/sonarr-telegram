# Arquitectura

## Visión General

- Bot/Cliente Telegram (GramJS) recibe mensajes de canales permitidos.
- Se extraen enlaces magnet/.torrent y se encolan (BullMQ).
- Workers procesan cola, validan metadatos y llaman a Sonarr.
- API Express expone health, métricas y endpoints administrativos.

## Componentes

- Web/API: `src/web/*`
- Worker: `src/worker/*`
- Telegram: `src/services/telegram/*`
- Sonarr: `src/services/sonarr/*`
- Compartidos: `src/shared/*`

## Seguridad

- Rate limiting, Helmet, CORS configurable.
- Sesiones de Telegram encriptadas con AES-256-GCM.
- Validación de datos con Zod.

## Observabilidad

- Logging estructurado (Pino).
- Métricas Prometheus (`/metrics`).

