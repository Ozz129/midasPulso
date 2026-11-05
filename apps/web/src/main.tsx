import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fuentes autoalojadas (sin peticiones a terceros).
import '@fontsource-variable/inter';
import '@fontsource-variable/inter/wght-italic.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/700-italic.css';
import '@fontsource/barlow-condensed/800-italic.css';

// Sistema de estilos global: se importa una sola vez, aquí.
import './shared/styles/tokens.css';
import './shared/styles/global.css';

import { AppRouter } from './app/AppRouter';
import { AuthProvider } from './features/auth/session/AuthProvider';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento #root');
}

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
);
