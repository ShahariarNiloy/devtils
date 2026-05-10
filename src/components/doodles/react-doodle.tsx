import { ZodDoodle } from './zod-doodle';

interface DoodleProps {
  className?: string;
  stroke?: string;
}

export function ReactDoodle({ className, stroke }: DoodleProps) {
  return <ZodDoodle className={className} stroke={stroke ?? "var(--color-terracotta)"} />;
}
