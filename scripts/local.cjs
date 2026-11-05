const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
process.chdir(root);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`El proceso termino con codigo ${code}.`)));
  });
}

async function availablePort(preferred) {
  for (let port = preferred; port < preferred + 100; port++) {
    const free = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', (error) => {
        if (['EADDRINUSE', 'EACCES'].includes(error.code)) resolve(false);
        else reject(error);
      });
      server.listen(port, () => server.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw new Error('No hay puertos disponibles para iniciar.');
}

async function main() {
  const major = Number(process.versions.node.split('.')[0]);
  if (!((major === 22 && Number(process.versions.node.split('.')[1]) >= 13) ||
    (major === 24 && Number(process.versions.node.split('.')[1]) >= 11) || major > 24)) {
    throw new Error('Instala Node.js 24 LTS (24.11 o superior).');
  }
  for (const [template, target] of [
    ['apps/core/.env.example', 'apps/core/.env'],
    ['apps/web/.env.example', 'apps/web/.env.local'],
  ]) {
    if (!fs.existsSync(target)) {
      fs.copyFileSync(template, target);
      console.log(`Creado ${target}.`);
    }
  }
  if (process.argv[2] === 'install') {
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['ci', '--no-audit', '--no-fund'], { shell: process.platform === 'win32' });
    console.log('Instalacion lista. Ejecuta iniciar.cmd (Windows) o node scripts/local.cjs.');
    return;
  }
  if (!fs.existsSync('node_modules/concurrently/dist/bin/index.js')) {
    throw new Error('Primero ejecuta instalar.cmd o node scripts/local.cjs install.');
  }
  process.loadEnvFile(path.join(root, 'apps/core/.env'));
  const coreRequire = createRequire(path.join(root, 'apps/core/package.json'));
  const { Client } = coreRequire('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
  } catch {
    throw new Error(
      'PostgreSQL no esta disponible o la base de desarrollo no existe.\n' +
      '  1. Comprueba que el servicio de PostgreSQL este iniciado.\n' +
      '  2. Si es la primera vez, crea la base (pedira la clave de postgres):\n' +
      '     "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe" -h localhost -U postgres -f scripts/create-dev-database.sql\n' +
      '  3. Revisa DATABASE_URL en apps/core/.env (o usa docker compose up -d postgres).');
  } finally {
    await client.end().catch(() => {});
  }
  console.log('Aplicando migraciones pendientes...');
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'migration:run', '--silent'], {
    shell: process.platform === 'win32',
  });
  const corePort = await availablePort(3100);
  const webPort = await availablePort(5273);
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(corePort),
    WEB_ORIGIN: `http://localhost:${webPort}`,
    VITE_API_BASE_URL: `http://localhost:${corePort}/api/v1`,
  };
  console.log(`\nWeb (registro): http://localhost:${webPort}\nDemo ficha: http://localhost:${webPort}/demo\nAPI: http://localhost:${corePort}/api/v1\nDocs: http://localhost:${corePort}/api/docs\nCtrl+C para detener.\n`);
  await run(process.execPath, [
    path.join(root, 'node_modules/concurrently/dist/bin/index.js'),
    '--names', 'core,web', '--prefix-colors', 'green,magenta', '--kill-others',
    'npm run dev:core', `npm run dev:web -- --port ${webPort}`,
  ], { env });
}

main().catch((error) => {
  console.error(`\nNo se pudo completar: ${error.message}`);
  process.exitCode = 1;
});
