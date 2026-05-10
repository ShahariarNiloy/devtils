interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function RegexDoodle({ className }: DoodleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={className}
      fill="none"
    >
      <text
        x="4"
        y="18"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fontWeight="500"
        fill="var(--color-terracotta)"
      >
        /^.+$/
      </text>
      <text
        x="6"
        y="30"
        fontFamily="var(--font-mono)"
        fontSize="7"
        fontWeight="500"
        fill="var(--color-amber)"
      >
        [a-z]+
      </text>
    </svg>
  );
}
