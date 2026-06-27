export default function MaterialIcon({ children, className = '', filled = false }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {children}
    </span>
  );
}
