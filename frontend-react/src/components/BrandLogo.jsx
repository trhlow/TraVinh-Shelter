export const BRAND_NAME = 'Công Tín Land';

// Mark: a roofline that resolves into a checkmark in one continuous stroke —
// ties "bất động sản" (roof) to "Tín" (verified/trusted) in a single gesture.
export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <span className={`brand-logo ${className}`.trim()} aria-label={BRAND_NAME}>
      <svg
        className="brand-logo-icon"
        viewBox="0 0 64 64"
        role="img"
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="14" fill="var(--color-primary)" />
        <path
          d="M15 30 L26 19 L34 27 L49 12"
          fill="none"
          stroke="var(--color-on-primary)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 34 L27 43 L46 24"
          fill="none"
          stroke="var(--color-on-primary)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span className="brand-logo-text">{BRAND_NAME}</span>
      )}
    </span>
  );
}
