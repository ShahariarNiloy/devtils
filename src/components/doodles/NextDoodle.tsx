interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function NextDoodle({ className, stroke = "var(--color-terracotta-deep)" }: DoodleProps) {
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
      <circle cx="20" cy="20" r="13" />
      <path d="M14 13v14" />
      <path d="M14 13l12 14" />
      <path d="M26 13v9" />
    </svg>
  );
}
