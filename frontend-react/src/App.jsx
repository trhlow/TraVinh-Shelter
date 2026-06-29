import { useEffect, useState } from 'react';
import { logout as logoutRequest } from './services/api.js';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './services/session.js';
import { resolveRoute } from './routes/index.jsx';

function readHashPath() {
  const hashPath = window.location.hash.replace(/^#/, '');
  return hashPath || window.location.pathname || '/';
}

export default function App() {
  const [path, setPath] = useState(readHashPath);
  const [session, setSession] = useState(loadStoredSession);
  const { Page, params } = resolveRoute(path);

  useEffect(() => {
    const onHashChange = () => setPath(readHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleLogin(nextSession) {
    saveStoredSession(nextSession);
    setSession(nextSession);
  }

  async function handleLogout() {
    const token = session?.token;
    clearStoredSession();
    setSession(null);
    if (token) {
      await logoutRequest(token).catch(() => null);
    }
    window.location.hash = '#/';
  }

  return <Page {...params} currentPath={path} session={session} onLogin={handleLogin} onLogout={handleLogout} />;
}
