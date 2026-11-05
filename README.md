# MYDAS PULSO

Producto de **Mydas Tech** para el acompañamiento deportivo entre coach y coachee.

| Pieza | Qué es | Estado |
| --- | --- | --- |
| **Pulso Web** (`apps/web`) | Panel exclusivo del coach: clientes, entrevistas, rutinas, agenda y planes de alimentación. | Shell inicial |
| **Pulso Core** (`apps/core`) | Backend compartido. API REST por dominio de negocio; concentra reglas de acceso y validaciones. | Base + health |
| **Pulso Mobile** (`apps/mobile`) | Una sola app para coach y coachee: entrenamiento guiado, captura con cámara, observaciones de IA y devoluciones del coach. | Planificado |

## Requisitos

- **Node.js** `^22.13.0 || >=24.11.0` (recomendado: 24 LTS, ver `.nvmrc`).
- **npm** 10 o superior. El monorepo usa npm workspaces con un único `package-lock.json` en la raíz; no uses otros gestores.
- **PostgreSQL** 16 o superior (probado con 18), local o mediante Docker.

## Estructura

```
mydas-pulso/
  apps/
    web/        React 19 + TypeScript + Vite 8 · CSS Modules + variables CSS
    core/       NestJS 12 + TypeScript (ESM) · TypeORM 1 + pg · OpenAPI
  scripts/      Utilidades (crear la base de desarrollo local)
  compose.yaml  PostgreSQL de desarrollo (opcional, Docker)
  package.json  Workspaces y scripts de la raíz
```

Estructura objetivo (se incorpora con sus flujos):

```
  apps/mobile/          App única para coach y coachee
  packages/api-client/  Cliente tipado del contrato OpenAPI de Core, compartido por Web y Mobile
```

`packages/api-client` se creará cuando exista un segundo consumidor de la API (Mobile). Mientras tanto, Web construye sus URLs con `apiUrl()` en `apps/web/src/shared/api/apiUrl.ts`.

### Pulso Core

```
apps/core/src/
  main.ts                    Bootstrap: prefijo /api, versionado URI (v1), CORS, OpenAPI en desarrollo
  app.module.ts
  config/                    Validación de entorno (zod) y carga de .env
  database/
    typeorm.config.ts        Configuración única de TypeORM (Nest + CLI). synchronize: false
    data-source.ts           DataSource del CLI de migraciones
    database.module.ts
    migrations/              Migraciones versionadas (la primera llegará con el primer esquema de dominio)
  modules/
    health/                  GET /api/v1/health
```

Cada dominio de negocio tendrá su módulo en `src/modules/<dominio>`.

### Pulso Web

```
apps/web/src/
  main.tsx                   Punto de entrada: fuentes, tokens.css y global.css (una sola vez)
  app/
    App.tsx                  Shell «Panel del coach»
    layouts/CoachLayout.*    Encabezado de marca + área principal (preparado para navegación)
  features/
    system-status/           Consulta de /health y estados de conexión con Core
  shared/
    api/apiUrl.ts            Convención única de URLs hacia Core
    styles/tokens.css        Colores, tipografía, espaciado y radios
    styles/global.css        Estilos base
    ui/Button · Card · Badge
```

## Inicio rápido (Windows)

1. Primera vez: crea la base local (pide la clave del usuario `postgres`):
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -U postgres -f scripts/create-dev-database.sql
   ```
2. `instalar.cmd`: instala dependencias y crea los `.env` si faltan.
3. `iniciar.cmd`: comprueba PostgreSQL, aplica migraciones pendientes, elige puertos libres (desde 3100 para Core y 5273 para Web) e imprime las URLs, incluida la de registro (`/registro`). Ctrl+C para detener.

En otras plataformas: `node scripts/local.cjs install` y `node scripts/local.cjs`.

## Instalación

```bash
npm install
```

## Configuración

Cada app tiene su archivo de entorno. Los archivos reales están excluidos de Git; solo se versionan los `.env.example`.

| Archivo | Plantilla | Variables |
| --- | --- | --- |
| `apps/core/.env` | `apps/core/.env.example` | `NODE_ENV`, `PORT` (3000), `DATABASE_URL`, `WEB_ORIGIN` (origen(es) de Web para CORS, separados por comas) |
| `apps/web/.env.local` | `apps/web/.env.example` | `VITE_API_BASE_URL` (p. ej. `http://localhost:3000/api/v1`) |

```bash
cp apps/core/.env.example apps/core/.env
cp apps/web/.env.example apps/web/.env.local
```

Core valida las variables al arrancar y se detiene con un mensaje que indica cuáles son inválidas (sin mostrar sus valores).

**Convención de URLs en Web:** `VITE_API_BASE_URL` apunta a la base versionada de la API, sin barra final. Toda ruta se construye con `apiUrl('/recurso')` → `${VITE_API_BASE_URL}/recurso`. El estado del sistema consulta `apiUrl('/health')`.

## PostgreSQL de desarrollo

Usa una base dedicada al desarrollo. Credenciales de ejemplo: usuario `pulso`, clave `pulso`, base `mydas_pulso`.

**Opción A — Docker** (`compose.yaml`, volumen persistente `pulso-postgres-data`):

```bash
docker compose up -d          # arranca PostgreSQL 18 en localhost:5432
docker compose stop           # lo detiene conservando los datos
```

Si ya tienes PostgreSQL local en el 5432, usa otro puerto (`POSTGRES_PORT=5433 docker compose up -d`) y ajústalo en `DATABASE_URL`.

**Opción B — instancia local**: crea el rol y la base una vez, como superusuario:

```bash
psql -h localhost -U postgres -f scripts/create-dev-database.sql
```

En ambos casos: `DATABASE_URL=postgres://pulso:pulso@localhost:5432/mydas_pulso`.

## Comandos (desde la raíz)

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca Core y Web juntos (modo watch) |
| `npm run dev:core` | Solo Core (`nest start --watch`) |
| `npm run dev:web` | Solo Web (Vite) |
| `npm run build` | Compila Core (`apps/core/dist`) y Web (`apps/web/dist`) |
| `npm run start:core` | Ejecuta Core compilado |
| `npm run preview:web` | Sirve el build de Web en http://localhost:4173 |
| `npm run typecheck` | Verificación de tipos en ambos workspaces |
| `npm run lint` | oxlint en ambos workspaces |
| `npm run check` | typecheck + lint + build |
| `npm run migration:show` | Lista migraciones y su estado |
| `npm run migration:run` | Ejecuta las migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración |
| `npm run migration:generate -- src/database/migrations/<Nombre>` | Genera una migración a partir de las entidades |
| `npm run migration:create -- src/database/migrations/<Nombre>` | Crea una migración vacía |

Los comandos de migración compilan Core y usan `apps/core/dist/database/data-source.js`, que lee `apps/core/.env`. Las rutas de `generate`/`create` son relativas a `apps/core`.

## Puertos y URLs

| Qué | URL |
| --- | --- |
| Pulso Web | http://localhost:5173 |
| API v1 de Core | http://localhost:3000/api/v1 |
| Health | http://localhost:3000/api/v1/health |
| OpenAPI (Swagger UI, solo `NODE_ENV=development`) | http://localhost:3000/api/docs |
| Documento OpenAPI JSON | http://localhost:3000/api/docs/openapi.json |

**Si los puertos 3000/5173 están ocupados** (por ejemplo, por otro proyecto), Web no salta a otro puerto (`strictPort`) y Core falla al arrancar. Para usar otros, por ejemplo 3100 y 5273:

1. En `apps/core/.env`: `PORT=3100` y `WEB_ORIGIN=http://localhost:5273`.
2. En `apps/web/.env.local`: `VITE_API_BASE_URL=http://localhost:3100/api/v1`.
3. Arranca Web con `npm run dev:web -- --port 5273` (y Core con `npm run dev:core`).

### Registro, inicio de sesión y sesión

**Rutas de Web**

| Ruta | Sin sesión | Con sesión |
| --- | --- | --- |
| `/`, rutas desconocidas | → `/registro` | → `/panel` |
| `/registro` | Crear cuenta de coach | → `/panel` |
| `/iniciar-sesion` | Iniciar sesión | → `/panel` |
| `/panel` | → `/iniciar-sesion` | Inicio del panel del coach |
| `/demo` | Demo de la ficha del coachee (pública) | Igual |

Google, Apple y «¿Olvidaste tu contraseña?» muestran por ahora un aviso de «próximamente».

**Endpoints de Core** (`/api/v1/auth`)

| Método y ruta | Respuestas |
| --- | --- |
| `POST /register` `{ fullName, email, password }` | `201` usuario · `400 VALIDATION_ERROR` (`fields`) · `409 EMAIL_TAKEN` · `429` |
| `POST /login` `{ email, password }` | `200` usuario + cookie de sesión · `401 INVALID_CREDENTIALS` · `429` |
| `GET /me` | `200` usuario · `401 UNAUTHENTICATED` |
| `POST /logout` | `204` y borra la cookie · `401` · `403 ORIGIN_NOT_ALLOWED` |

**Cómo funciona la sesión**

- Token aleatorio de 256 bits en la cookie `pulso_session` (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, ruta `/api`, 7 días). En la tabla `sessions` solo se guarda su hash SHA-256; cerrar sesión la elimina.
- Las peticiones con cookie que modifican datos deben venir de un origen de `WEB_ORIGIN` (defensa CSRF). CORS permite credenciales solo para esos orígenes.
- Login y registro: máximo 10 intentos por minuto e IP (`429` con `Retry-After`). El login responde igual, y en tiempo similar, exista o no el correo.
- Contraseñas: hash scrypt (`node:crypto`). Correos en minúsculas con índice único.
- Pulso Web solo abre sesión con cuentas `coach`; una cuenta `coachee` recibe un aviso para usar Pulso Mobile.
- Mobile recibirá su variante de token (cabecera `Authorization: Bearer`) cuando exista la app; el modelo de sesión ya lo admite.

Esquema: tablas `users` (migración `CreateUsers`) y `sessions` (migración `CreateSessions`, borrado en cascada con el usuario).

### Health endpoint

`GET /api/v1/health` ejecuta `SELECT 1` contra PostgreSQL (máx. 2 s):

- `200 {"status":"ok"}`: la API y la base están disponibles.
- `503 {"status":"unavailable"}`: la API responde pero la base perdió conectividad. No expone credenciales ni detalles internos (el motivo solo se registra en el log de Core).

Si PostgreSQL no está disponible **al arrancar**, Core reintenta la conexión 5 veces y luego se detiene.

## Identidad visual (Web)

Tema oscuro con tokens semánticos en `tokens.css`: Grafito `#111318` (fondo), Pizarra `#222630` (superficies), Blanco frío `#F5F7FA` (texto), Lima `#C6F64E` (acción principal y foco), Violeta `#BEAAFF` (reservado para Asistente Pulso) y Dorado `#C9A34E` (firma corporativa DORÉ). Los estados funcionales (éxito, error, pendiente) usan colores propios, separados de la marca, y siempre se comunican con texto e ícono. Tipografías: Inter (interfaz) y Barlow Condensed (titulares de marca), autoalojadas con Fontsource.

El encabezado usa la marca tipográfica «MYDAS PULSO». Cuando esté disponible el activo oficial de la P lima con la corona de DORÉ, sustitúyelo en `apps/web/src/app/layouts/CoachLayout.tsx`.

## Cómo comparten Core Web y Mobile

Core es la única fuente de verdad: Web (coach) y Mobile (coach y coachee) consumen la misma API REST versionada (`/api/v1`), documentada con OpenAPI. Cuando llegue Mobile, el contrato OpenAPI generará `packages/api-client`, usado por ambos clientes. Las operaciones protegidas validarán en Core tanto el **rol** (coach/coachee) como el **vínculo coach–coachee**, de modo que ningún cliente pueda saltarse las reglas de acceso.

## Primer flujo funcional

Registro e inicio de sesión del coach ya están conectados. Siguiente corte: **el coach abre la ficha de un coachee y publica un ejercicio con una indicación personal**, con el vínculo coach–coachee validado en Core.

## Notas

- `npm audit` reporta una vulnerabilidad moderada en `minimatch`, fijada por `@nestjs/cli` 12 (solo desarrollo, no se incluye en el build). Se resolverá al actualizar el CLI.
- El paquete `@scarf/scarf` (dependencia de `@nestjs/swagger`) declara un `postinstall` de telemetría que npm no ejecuta por defecto; no es necesario aprobarlo.
