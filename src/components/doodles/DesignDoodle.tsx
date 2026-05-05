interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function DesignDoodle({ className, stroke = "var(--color-amber)" }: DoodleProps) {
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
      <path d="M20 7c-7.5 0 -13 5.6 -13 12.5 0 4.5 3.4 7.5 7.5 7.5 1.7 0 3 -0.7 3 -2 0 -0.6 -0.3 -1 -0.6 -1.4 -0.3 -0.5 -0.6 -1 -0.6 -1.6 0 -1.4 1.1 -2.5 2.5 -2.5h2.7c5 0 9 -3.6 9 -8 0 -2.6 -2.5 -4.5 -10.5 -4.5z" />
      <circle cx="13" cy="16" r="1.4" fill={stroke} />
      <circle cx="20" cy="13" r="1.4" fill={stroke} />
      <circle cx="26" cy="16" r="1.4" fill={stroke} />
    </svg>
  );
}
