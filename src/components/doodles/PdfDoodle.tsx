interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function PdfDoodle({ className, stroke = "var(--color-terracotta-deep)" }: DoodleProps) {
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
      <path d="M11 8h14l5 5v19a1 1 0 0 1 -1 1h-18a1 1 0 0 1 -1 -1v-23a1 1 0 0 1 1 -1z" />
      <path d="M25 8v5h5" />
      <path d="M14 22h12" />
      <path d="M14 26h9" />
    </svg>
  );
}
