interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function CalcDoodle({ className, stroke = "var(--color-terracotta)" }: DoodleProps) {
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
      <path d="M13 8l-3 24" />
      <path d="M22 8l-3 24" />
      <path d="M8 16h24" />
      <path d="M7 26h22" />
    </svg>
  );
}
