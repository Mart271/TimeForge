/**
 * Lucide ships no ₱ (Philippine Peso) icon — every finance surface that used
 * lucide's DollarSign ended up showing a $ regardless of the app being
 * PHP-only. Drawn to match lucide's 24x24 / stroke-2 / currentColor
 * conventions so it drops in wherever DollarSign was used.
 */
export function PesoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3v18" />
      <path d="M6 3h9a5 5 0 0 1 0 10H6" />
      <path d="M3 9h13" />
      <path d="M3 13h10" />
    </svg>
  );
}
