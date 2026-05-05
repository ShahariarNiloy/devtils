interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function SecurityDoodle({ className, stroke = "var(--color-terracotta-deep)" }: DoodleProps) {
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
      <circle cx="14" cy="20" r="5" />
      <path d="M19 20h13" />
      <path d="M27 20v5" />
      <path d="M31 20v3" />
    </svg>
  );
}
