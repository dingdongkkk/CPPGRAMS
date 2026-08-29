/**
 * One stroke-based icon set, drawn on a 24×24 grid at a single 1.6 weight.
 * Replaces the emoji the interface used to render as icons — emoji pick up
 * the reader's platform font, so they arrived at inconsistent sizes, colours
 * and baselines, and several (⌖ 文 ▦ ◷) have no reliable glyph on Android.
 */
type IconProps = { size?: number; className?: string };

function Svg({
  size = 20,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconMic = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
  </Svg>
);
export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </Svg>
);
export const IconLanguages = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5.5h8M7 3.5v2M9.2 5.5c0 3.6-2.4 6.6-5.7 7.8M5 9.4c.9 2 2.6 3.4 4.8 4.1M12.5 21l4-9.5 4 9.5M14 17.6h5.2" />
  </Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" />
    <path d="M8 10V7.2a4 4 0 0 1 8 0V10" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />
  </Svg>
);
export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.5 12h-15M11 5.5 4.5 12 11 18.5" />
  </Svg>
);
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 5.5 8.5 12l6.5 6.5" />
  </Svg>
);
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 5.5 6.5 6.5L9 18.5" />
  </Svg>
);
export const IconSpark = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2c.9 4.3 2.5 5.9 6.8 6.8-4.3.9-5.9 2.5-6.8 6.8-.9-4.3-2.5-5.9-6.8-6.8 4.3-.9 5.9-2.5 6.8-6.8Z" />
    <path d="M18.4 16.2c.4 1.9 1.1 2.6 3 3-1.9.4-2.6 1.1-3 3-.4-1.9-1.1-2.6-3-3 1.9-.4 2.6-1.1 3-3Z" />
  </Svg>
);
export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.4 3.5H5.6A2.1 2.1 0 0 0 3.5 5.8C3.9 13.4 10.6 20.1 18.2 20.5a2.1 2.1 0 0 0 2.3-2.1v-2.8l-4.4-1.5-2 2a15.6 15.6 0 0 1-6.2-6.2l2-2Z" />
  </Svg>
);
export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.2" />
    <path d="m3.8 6.4 8.2 6 8.2-6" />
  </Svg>
);
export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 6.8V12l3.4 2.2" />
  </Svg>
);
export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.8 21 19.4H3L12 3.8Z" />
    <path d="M12 9.6v4M12 16.4h.01" />
  </Svg>
);
export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.6v11M7.8 10.6 12 14.8l4.2-4.2M4.5 19.4h15" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.2v13.6M5.2 12h13.6" />
  </Svg>
);
export const IconHash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.6 3.6 7.8 20.4M16.2 3.6l-1.8 16.8M4.2 9h16M3.8 15h16" />
  </Svg>
);
export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="3.6" width="7" height="7" rx="1.6" />
    <rect x="13.4" y="3.6" width="7" height="7" rx="1.6" />
    <rect x="3.6" y="13.4" width="7" height="7" rx="1.6" />
    <rect x="13.4" y="13.4" width="7" height="7" rx="1.6" />
  </Svg>
);
export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4.2V9h-4.8" />
  </Svg>
);
export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5.6 18 12 8 18.4V5.6Z" />
  </Svg>
);
export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.2 5.4v13.2M14.8 5.4v13.2" />
  </Svg>
);
export const IconStop = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.4" y="6.4" width="11.2" height="11.2" rx="1.8" />
  </Svg>
);
export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 11.2v5M12 8h.01" />
  </Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m15.8 15.8 4.4 4.4" />
  </Svg>
);
export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.2" r="4" />
    <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
  </Svg>
);

/**
 * The Ashoka Chakra — the 24-spoke wheel from the national flag, drawn to
 * spec rather than approximated with a glyph. Used as a civic motif; the
 * State Emblem (the four-lion capital) is deliberately not used, since its
 * use is restricted by the State Emblem of India (Prohibition of Improper
 * Use) Act, 2005 and JanSetu is not a government body.
 */
export function AshokaChakra({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {/* Stroke weights are set for the ~26px size this is actually used
          at; thinner spokes disappear entirely once scaled down. */}
      <g fill="none" stroke="currentColor" strokeLinecap="butt">
        <circle cx="50" cy="50" r="46" strokeWidth={5} />
        {spokes.map((angle) => (
          <line
            key={angle}
            x1="50"
            y1="50"
            x2="50"
            y2="8"
            transform={`rotate(${angle} 50 50)`}
            strokeWidth={3.4}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="9" fill="currentColor" />
    </svg>
  );
}
