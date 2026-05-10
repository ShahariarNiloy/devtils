interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function TextDoodle({ className }: DoodleProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={className} fill="none">
      <text
        x="20"
        y="32"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="32"
        fontWeight="500"
        fill="var(--color-terracotta)"
        opacity="0.85"
      >
        A
      </text>
    </svg>
  );
}
