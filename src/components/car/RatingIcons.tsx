import type { RatingKey } from '../../types/models';

/**
 * The seven category glyphs, drawn to match concept.png.
 * Inline SVG rather than emoji so they look identical on every platform.
 */
type Props = { size?: number };

const svg = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  'aria-hidden': true,
  focusable: 'false' as const,
});

function Heart({ size = 22 }: Props) {
  return (
    <svg {...svg(size)}>
      <path
        d="M12 20.3C10.4 19 4.3 14.9 4.3 10.4a4.2 4.2 0 0 1 7.7-2.3 4.2 4.2 0 0 1 7.7 2.3c0 4.5-6.1 8.6-7.7 9.9Z"
        stroke="#EF4778"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Seat({ size = 22 }: Props) {
  return (
    <svg {...svg(size)}>
      {/* backrest */}
      <path
        d="M8.6 3.9h3.1c1.2 0 2.2 1 2.2 2.2v6.3a2.2 2.2 0 0 1-2.2 2.2H7.9"
        stroke="#2A3A6B"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.6 3.9a2.2 2.2 0 0 0-2.2 2.2v6.4"
        stroke="#2A3A6B"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* seat base */}
      <path
        d="M6.4 12.5 4.7 18a1.6 1.6 0 0 0 1.5 2.1h11.5"
        stroke="#2A3A6B"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.9 14.6h9.3a2 2 0 0 1 2 2v3.5"
        stroke="#2A3A6B"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Monitor({ size = 22 }: Props) {
  return (
    <svg {...svg(size)}>
      <rect
        x="3.2"
        y="4.6"
        width="17.6"
        height="12"
        rx="2"
        stroke="#6B3FD4"
        strokeWidth="1.9"
      />
      <rect x="5.4" y="6.8" width="13.2" height="7.6" rx="1" fill="#6B3FD4" opacity="0.16" />
      <path
        d="M9.6 19.7h4.8M12 16.6v3.1"
        stroke="#6B3FD4"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Speedo({ size = 22 }: Props) {
  return (
    <svg {...svg(size)}>
      <circle cx="12" cy="12" r="8.4" stroke="#E03A34" strokeWidth="1.9" />
      <path
        d="M15.6 8.6 11.4 12"
        stroke="#E03A34"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.5" fill="#E03A34" />
      <path d="M12 3.6v1.6M20.4 12h-1.6M5.2 12H3.6" stroke="#E03A34" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Paw({ size = 22 }: Props) {
  return (
    <svg {...svg(size)}>
      <ellipse cx="7.1" cy="9.3" rx="1.85" ry="2.4" fill="#12604F" />
      <ellipse cx="11.4" cy="7.4" rx="1.85" ry="2.5" fill="#12604F" />
      <ellipse cx="15.9" cy="8.6" rx="1.85" ry="2.4" fill="#12604F" />
      <ellipse cx="19" cy="12.4" rx="1.7" ry="2.1" fill="#12604F" />
      <path
        d="M12.6 12.3c2.3 0 4.4 1.9 4.9 4 .4 1.8-.9 3.3-2.7 3.3-1 0-1.6-.3-2.4-.3s-1.5.3-2.5.3c-1.8 0-3-1.5-2.6-3.3.5-2.1 2.9-4 5.3-4Z"
        fill="#12604F"
      />
    </svg>
  );
}

function Sparkles({ size = 22 }: Props) {
  return (
    <svg {...svg(size)}>
      <path
        d="M14 2.6 16 8.2l5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2z"
        fill="#F0B02C"
      />
      <path d="M6.2 13.6 7.3 16.6l3 1.1-3 1.1-1.1 3-1.1-3-3-1.1 3-1.1z" fill="#F6CE72" />
    </svg>
  );
}

function Coins({ size = 22 }: Props) {
  return (
    <svg {...svg(size)}>
      <ellipse cx="12" cy="6.7" rx="6.6" ry="2.6" fill="#F3B93D" />
      <path
        d="M5.4 6.7v3.1c0 1.4 3 2.6 6.6 2.6s6.6-1.2 6.6-2.6V6.7"
        stroke="#D69A22"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M5.4 10.4v3.1c0 1.4 3 2.6 6.6 2.6s6.6-1.2 6.6-2.6v-3.1"
        stroke="#D69A22"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M5.4 14.1v3.1c0 1.4 3 2.6 6.6 2.6s6.6-1.2 6.6-2.6v-3.1"
        stroke="#D69A22"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS: Record<RatingKey, (props: Props) => React.ReactElement> = {
  cuteness: Heart,
  comfyness: Seat,
  techonologia: Monitor,
  vroomFactor: Speedo,
  rioApproved: Paw,
  unexpectedFactor: Sparkles,
  value: Coins,
};

export function RatingIcon({ category, size = 22 }: { category: RatingKey; size?: number }) {
  const Glyph = ICONS[category];
  return <Glyph size={size} />;
}
