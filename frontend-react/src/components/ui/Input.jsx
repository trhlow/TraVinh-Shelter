export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  id,
  name,
  required,
  autoComplete,
  rows,
}) {
  const cls = `input ${className}`.trim();
  if (type === 'textarea') {
    return (
      <textarea
        id={id} name={name} className={cls} placeholder={placeholder}
        value={value} onChange={onChange} required={required} rows={rows || 4}
      />
    );
  }
  return (
    <input
      id={id} name={name} type={type} className={cls} placeholder={placeholder}
      value={value} onChange={onChange} required={required} autoComplete={autoComplete}
    />
  );
}
