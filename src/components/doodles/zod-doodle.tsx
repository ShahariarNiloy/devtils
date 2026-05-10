interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function ZodDoodle({ className, stroke = "var(--color-terracotta)" }: DoodleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="20" cy="20" r="2" />
      <ellipse cx="20" cy="20" rx="13" ry="5" />
      <ellipse cx="20" cy="20" rx="13" ry="5" transform="rotate(60 20 20)" />
      <ellipse cx="20" cy="20" rx="13" ry="5" transform="rotate(120 20 20)" />
    </svg>
  );
}
