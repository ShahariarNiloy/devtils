import { ZodDoodle } from "./ZodDoodle";

interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function ReactDoodle({ className, stroke }: DoodleProps) {
  return <ZodDoodle className={className} stroke={stroke ?? "var(--color-terracotta)"} />;
}
