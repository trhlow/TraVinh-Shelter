export default function Card({ children, className = '', as: Tag = 'div', href, onClick }) {
  const cls = `card ${className}`.trim();
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <Tag className={cls} onClick={onClick}>{children}</Tag>;
}
