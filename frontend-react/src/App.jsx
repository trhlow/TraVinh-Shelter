import { useEffect, useState } from 'react';
import { resolveRoute } from './routes/index.jsx';

function readHashPath() {
  return window.location.hash.replace(/^#/, '') || '/';
}

export default function App() {
  const [path, setPath] = useState(readHashPath);
  const Page = resolveRoute(path);

  useEffect(() => {
    const onHashChange = () => setPath(readHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return <Page />;
}
