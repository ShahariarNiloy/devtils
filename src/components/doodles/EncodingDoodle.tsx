interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function EncodingDoodle({ className, stroke = "var(--color-terracotta-deep)" }: DoodleProps) {
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
      <text
        x="6"
        y="20"
        fontFamily="var(--font-mono)"
        fontSize="11"
        fontWeight="500"
        fill={stroke}
        stroke="none"
      >
        01
      </text>
      <text
        x="6"
        y="33"
        fontFamily="var(--font-mono)"
        fontSize="11"
        fontWeight="500"
        fill="var(--color-amber)"
        stroke="none"
      >
        10
      </text>
    </svg>
  );
}
