/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API v1 de Pulso Core, p. ej. http://localhost:3000/api/v1 */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
