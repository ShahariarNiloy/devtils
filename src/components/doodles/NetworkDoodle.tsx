interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function NetworkDoodle({ className, stroke = "var(--color-sage-deep)" }: DoodleProps) {
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
      <circle cx="20" cy="20" r="12" />
      <ellipse cx="20" cy="20" rx="5" ry="12" />
      <path d="M8 20h24" />
    </svg>
  );
}
