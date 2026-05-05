interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function DataDoodle({ className, stroke = "var(--color-terracotta)" }: DoodleProps) {
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
      <ellipse cx="20" cy="11" rx="10" ry="3" />
      <path d="M10 11v6c0 1.7 4.5 3 10 3s10 -1.3 10 -3v-6" />
      <path d="M10 20v6c0 1.7 4.5 3 10 3s10 -1.3 10 -3v-6" />
    </svg>
  );
}
