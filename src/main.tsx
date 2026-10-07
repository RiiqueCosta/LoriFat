import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guarda o convite de instalação do app (PWA) para o botão em Configurações.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as { __lorifatInstall?: Event }).__lorifatInstall = e;
});

// Service worker: permite instalar o app e abrir mais rápido. Só em produção.
if ('serviceWorker' in navigator && (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker não registrado:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
