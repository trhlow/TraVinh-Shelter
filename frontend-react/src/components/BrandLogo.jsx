export const BRAND_NAME = 'Công Tín Land';

export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <span className={`brand-logo ${className}`.trim()} aria-label={BRAND_NAME}>
      <svg
        className="brand-logo-icon"
        viewBox="0 0 64 64"
        role="img"
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="12" fill="#003366" />
        <path d="M13 37L32 18l19 19v15H13V37Z" fill="#F4B000" />
        <path d="M21 52V35l11-10 11 10v17H21Z" fill="#FFFFFF" />
        <path d="M27 52V39h10v13H27Z" fill="#003366" />
        <path d="M17 24h13v6H17a8 8 0 0 0 0 16h4v6h-4a14 14 0 0 1 0-28Z" fill="#5DBB63" />
        <path d="M36 24h15v6H41v22h-6V24h1Z" fill="#5DBB63" />
      </svg>
      {!compact && (
        <span className="brand-logo-text">{BRAND_NAME}</span>
      )}
    </span>
  );
}
