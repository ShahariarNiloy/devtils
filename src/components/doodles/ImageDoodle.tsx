interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function ImageDoodle({ className, stroke = "var(--color-amber)" }: DoodleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="9" width="28" height="22" rx="2" />
      <circle cx="28" cy="16" r="2.5" />
      <path d="M8 28l7 -8 5 5 4 -4 8 7" />
    </svg>
  );
}
