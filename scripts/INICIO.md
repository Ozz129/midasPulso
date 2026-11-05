# Inicio local

Desde la raiz del proyecto:

- `instalar.cmd`: instala las versiones del lockfile y crea los archivos de entorno solo si faltan.
- `iniciar.cmd`: comprueba PostgreSQL, aplica migraciones pendientes e inicia Core y Web juntos. Imprime la URL de registro. Detener con Ctrl+C.
- En otras plataformas: `node scripts/local.cjs install` y `node scripts/local.cjs`.

Requiere Node.js compatible con package.json, npm >=10 y PostgreSQL configurado en `apps/core/.env`. Para instalar dependencias se necesita acceso al registro npm.

El inicio utiliza puertos libres desde 3100 para Core y desde 5273 para Web. Imprime las URLs elegidas y configura API y CORS en el proceso, sin sobrescribir los archivos de entorno. No detiene aplicaciones que ocupen otros puertos.

Si PostgreSQL no responde, inicia tu servicio local. Con Docker instalado, puedes usar `docker compose up -d postgres`. Para crear por primera vez la base local, usa `psql -h localhost -U postgres -f scripts/create-dev-database.sql`.

Diagnostico del 4 de noviembre de 2026: `npm run dev` fallo porque los puertos 3000 y 5173 estaban ocupados. El endpoint en 3000 se identifico como `midas-care-api`. PostgreSQL estaba disponible. Se reinstalaron dependencias con `npm ci` y pasaron tipos, lint y compilacion. No se modifico el codigo fuente de la app.
