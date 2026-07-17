import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './styles.css';
import './styles/home.css';
import './styles/carousel.css';
import './styles/gallery.css';
import './styles/detail.css';
// Redesign tokens must load after the legacy :root block so they win.
import './styles/tokens.css';
import './styles/card.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
