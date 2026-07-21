import { buildPageMeta } from '../services/pageMeta.js';

export default function PageMeta({ routeKey, data }) {
  const { title, description, robots } = buildPageMeta(routeKey, data);
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {robots === 'noindex' && <meta name="robots" content="noindex" />}
    </>
  );
}
