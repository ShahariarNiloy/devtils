interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function ColorDoodle({ className, stroke }: DoodleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="14" cy="16" r="6" stroke={stroke ?? "var(--color-terracotta)"} />
      <circle cx="22" cy="16" r="6" stroke={stroke ?? "var(--color-amber)"} />
      <circle cx="14" cy="24" r="6" stroke={stroke ?? "var(--color-terracotta-deep)"} />
      <circle cx="22" cy="24" r="6" stroke={stroke ?? "var(--color-sage-deep)"} />
    </svg>
  );
}
