/** Line icons drawn to match the weight and feel of concept.png. */

type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
});

export function HomeIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.6 10.4 12 3.8l8.4 6.6" />
      <path d="M5.6 9.2V19a1.2 1.2 0 0 0 1.2 1.2h10.4a1.2 1.2 0 0 0 1.2-1.2V9.2" />
      <path d="M9.7 20.2v-5.3h4.6v5.3" />
    </svg>
  );
}

export function CarIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 15.2v2.3a.9.9 0 0 0 .9.9h1.5a.9.9 0 0 0 .9-.9v-1.1" />
      <path d="M17.7 16.4v1.1a.9.9 0 0 0 .9.9h1.5a.9.9 0 0 0 .9-.9v-2.3" />
      <path d="M3 15.4v-3.1c0-.5.2-.9.6-1.2l1.3-.9 1.5-3.4a1.8 1.8 0 0 1 1.6-1h7.9c.7 0 1.4.4 1.7 1l1.5 3.4 1.3.9c.4.3.6.7.6 1.2v3.1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M5 10.6h14" />
      <circle cx="7.4" cy="13.4" r="1.05" />
      <circle cx="16.6" cy="13.4" r="1.05" />
    </svg>
  );
}

export function CompareIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="6.6" cy="7" r="3" />
      <circle cx="17.4" cy="17" r="3" />
      <path d="M17.4 4v6" />
      <path d="M6.6 20v-6" />
      <path d="M19.8 6.4 17.4 4 15 6.4" />
      <path d="M4.2 17.6 6.6 20 9 17.6" />
    </svg>
  );
}

export function MoreIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 7.5h16" />
      <path d="M4 16.5h16" />
      <circle cx="15" cy="7.5" r="0.1" />
    </svg>
  );
}

export function GearIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.6 14.4a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 1 1-2.55 2.55l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V20a1.8 1.8 0 0 1-3.6 0v-.1a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.05.05A1.8 1.8 0 1 1 4 16.33l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H2.8a1.8 1.8 0 0 1 0-3.6h.1a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65L3.92 7.4a1.8 1.8 0 1 1 2.55-2.55l.05.05a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37V3.8a1.8 1.8 0 0 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 1 1 2.55 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9h.1a1.8 1.8 0 0 1 0 3.6h-.1a1.5 1.5 0 0 0-1.37.9Z" />
    </svg>
  );
}

export function BackIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.1} className={className}>
      <path d="M15 5.5 8 12l7 6.5" />
    </svg>
  );
}

export function ChevronRight({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.1} className={className}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </svg>
  );
}

export function ChevronDown({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.1} className={className}>
      <path d="M5.5 9 12 15.5 18.5 9" />
    </svg>
  );
}

export function CameraIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.4 8.9A1.9 1.9 0 0 1 5.3 7h1.9l1.1-2.1a1.2 1.2 0 0 1 1.07-.65h5.26c.45 0 .86.25 1.07.65L16.8 7h1.9a1.9 1.9 0 0 1 1.9 1.9v8.2a1.9 1.9 0 0 1-1.9 1.9H5.3a1.9 1.9 0 0 1-1.9-1.9Z" />
      <circle cx="12" cy="12.9" r="3.3" />
    </svg>
  );
}

export function ImageIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3.2" y="4.8" width="17.6" height="14.4" rx="2.4" />
      <circle cx="8.6" cy="9.8" r="1.5" />
      <path d="m4 16.6 4.3-4.1a1.7 1.7 0 0 1 2.3 0l5.1 4.8" />
      <path d="m14.3 13.6 1.6-1.5a1.7 1.7 0 0 1 2.3 0l2.6 2.4" />
    </svg>
  );
}

export function TrashIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 6.6h15" />
      <path d="M9.4 6.6V5.1a1.3 1.3 0 0 1 1.3-1.3h2.6a1.3 1.3 0 0 1 1.3 1.3v1.5" />
      <path d="M6.6 6.6 7.4 19a1.3 1.3 0 0 0 1.3 1.2h6.6a1.3 1.3 0 0 0 1.3-1.2l.8-12.4" />
    </svg>
  );
}

export function StarOutlineIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 2.6l2.72 5.86 6.28.79-4.63 4.4 1.2 6.35L12 16.9l-5.57 3.1 1.2-6.35-4.63-4.4 6.28-.79z"
        fill="var(--gold)"
        stroke="var(--gold-strong)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SortIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 4.8v14.4" />
      <path d="m3.6 8.2 3.4-3.4 3.4 3.4" />
      <path d="M17 19.2V4.8" />
      <path d="m13.6 15.8 3.4 3.4 3.4-3.4" />
    </svg>
  );
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.7} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2" />
      <path d="M12 7.8v.1" />
    </svg>
  );
}

export function PlusIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.3} className={className}>
      <path d="M12 5.2v13.6" />
      <path d="M5.2 12h13.6" />
    </svg>
  );
}

export function CheckIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.4} className={className}>
      <path d="m4.8 12.4 4.6 4.6 9.8-9.8" />
    </svg>
  );
}

export function HeartIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M12 20.2s-7.6-4.6-7.6-9.6a4.3 4.3 0 0 1 7.6-2.7 4.3 4.3 0 0 1 7.6 2.7c0 5-7.6 9.6-7.6 9.6Z" />
    </svg>
  );
}

export function CloseIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.2} className={className}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function CopyIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2.6" />
      <path d="M15 5.6A1.6 1.6 0 0 0 13.4 4H5.6A1.6 1.6 0 0 0 4 5.6v7.8A1.6 1.6 0 0 0 5.6 15" />
    </svg>
  );
}

export function DragHandleIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2} className={className}>
      <path d="M9 7h.01" />
      <path d="M15 7h.01" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M9 17h.01" />
      <path d="M15 17h.01" />
    </svg>
  );
}

export function MoveUpIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.1} className={className}>
      <path d="M12 19V6" />
      <path d="m6.5 11.5 5.5-5.5 5.5 5.5" />
    </svg>
  );
}

export function MoveDownIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={2.1} className={className}>
      <path d="M12 5v13" />
      <path d="m6.5 12.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}

/** The pink hatchback from the concept's header. */
export function CarRaterLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 64 50"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 34.5c0-2 .6-3.4 2.2-4.4l2.4-1.5 4.1-10.2C17.9 15.4 20.6 13.6 23.6 13.6h16.8c3 0 5.7 1.8 6.9 4.8l4.1 10.2 2.4 1.5c1.6 1 2.2 2.4 2.2 4.4v5.1c0 1.5-1.2 2.7-2.7 2.7H10.7A2.7 2.7 0 0 1 8 39.6z"
        fill="var(--accent-pink)"
      />
      <path
        d="M17.6 28.2 21 19.6c.5-1.3 1.6-2 3-2h16c1.4 0 2.5.7 3 2l3.4 8.6z"
        fill="#fff"
        opacity="0.92"
      />
      <path d="M31 17.6h2v10.6h-2z" fill="var(--accent-pink)" opacity="0.55" />
      <circle cx="19.5" cy="34.2" r="2.6" fill="#12181c" />
      <circle cx="44.5" cy="34.2" r="2.6" fill="#12181c" />
      <rect x="14" y="41" width="7" height="6" rx="2.6" fill="#12181c" />
      <rect x="43" y="41" width="7" height="6" rx="2.6" fill="#12181c" />
      <rect x="28.4" y="30.8" width="7.2" height="4.4" rx="2.2" fill="#fff" opacity="0.8" />
      <path d="M16 9.6c0-1.1.9-2 2-2h4v5h-6z" fill="var(--accent-pink)" opacity="0.75" />
    </svg>
  );
}
