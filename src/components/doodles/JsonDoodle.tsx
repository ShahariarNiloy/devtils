interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function JsonDoodle({ className, stroke = "var(--color-terracotta)" }: DoodleProps) {
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
      <path d="M16 8c-3.4 0.3 -5 1.6 -5 4.5 0 2.6 0.4 4.7 -0.6 6.2 -0.6 0.9 -1.6 1.4 -2.6 1.5 1.1 0.1 2 0.6 2.6 1.4 1 1.4 0.6 3.5 0.6 6.1 0 2.9 1.6 4.2 5 4.5" />
      <path d="M24 8c3.4 0.3 5 1.6 5 4.5 0 2.6 -0.4 4.7 0.6 6.2 0.6 0.9 1.6 1.4 2.6 1.5 -1.1 0.1 -2 0.6 -2.6 1.4 -1 1.4 -0.6 3.5 -0.6 6.1 0 2.9 -1.6 4.2 -5 4.5" />
    </svg>
  );
}
