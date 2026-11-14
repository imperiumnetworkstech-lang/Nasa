/** Original, friendly SVG illustrations (no external imagery). */
export function AstronautIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden>
      <circle cx="122" cy="34" r="6" fill="#FFD27A" />
      <circle cx="28" cy="40" r="3" fill="#fff" opacity=".7" />
      <circle cx="140" cy="96" r="2.5" fill="#fff" opacity=".7" />
      {/* backpack */}
      <rect x="44" y="70" width="72" height="62" rx="18" fill="#D9D0FF" />
      {/* body */}
      <rect x="50" y="74" width="60" height="62" rx="22" fill="#fff" />
      <rect x="66" y="96" width="28" height="18" rx="6" fill="#EFEAFF" />
      <circle cx="74" cy="105" r="3" fill="#E2677A" />
      <circle cx="86" cy="105" r="3" fill="#20A7A0" />
      {/* arm waving */}
      <path d="M108 92c10-6 16-16 18-28" stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none" />
      <circle cx="127" cy="60" r="8" fill="#fff" />
      <path d="M52 94c-8 6-10 16-8 24" stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none" />
      {/* helmet */}
      <circle cx="80" cy="54" r="32" fill="#fff" />
      <rect x="56" y="38" width="48" height="34" rx="17" fill="#2A2550" />
      <path d="M64 46c6-5 16-6 22-3" stroke="#8B6DFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".8" />
      <circle cx="70" cy="57" r="3" fill="#fff" />
      <circle cx="90" cy="57" r="3" fill="#fff" />
      <path d="M73 64c4 3 10 3 14 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* medical cross patch */}
      <rect x="96" y="80" width="10" height="10" rx="2" fill="#6C4CF5" />
      <path d="M101 82v6M98 85h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlanetIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <circle cx="60" cy="60" r="32" fill="#FFD27A" />
      <circle cx="50" cy="52" r="6" fill="#F5B94F" />
      <circle cx="70" cy="70" r="4" fill="#F5B94F" />
      <ellipse cx="60" cy="62" rx="54" ry="14" fill="none" stroke="#fff" strokeWidth="5" opacity=".85" transform="rotate(-18 60 62)" />
    </svg>
  );
}
