interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function CodeDoodle({ className, stroke = "var(--color-sage-deep)" }: DoodleProps) {
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
      <path d="M14 13l-7 7 7 7" />
      <path d="M26 13l7 7 -7 7" />
      <path d="M22 11l-4 18" />
    </svg>
  );
}
