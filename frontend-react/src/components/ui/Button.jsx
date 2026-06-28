export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  type = 'button',
  onClick,
  disabled,
  as: Tag = 'button',
  href,
}) {
  const cls = `btn btn-${variant} btn-${size} ${className}`.trim();
  if (Tag === 'a' || href) {
    return <a href={href} className={cls}>{children}</a>;
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
