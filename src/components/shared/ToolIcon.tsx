import * as LucideIcons from "lucide-react";
import { Code2, type LucideIcon } from "lucide-react";

const lucideMap = LucideIcons as unknown as Record<string, LucideIcon>;

/**
 * Convert kebab-case (e.g. "bar-chart-3", "case-sensitive") to the
 * PascalCased Lucide export name (e.g. "BarChart3", "CaseSensitive").
 */
function toPascal(name: string): string {
  return name
    .split("-")
    .map((segment) => (segment.length > 0 ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join("");
}

interface Props {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean;
}

/**
 * Resolves a Lucide icon by name from the tools registry. Accepts kebab-case
 * (`bar-chart-3`) and PascalCase (`BarChart3`). Falls back to `Code2` if the
 * name is unknown so we never crash on a stale icon ref.
 */
export function ToolIcon({ name, size = 16, className, style, ...rest }: Props) {
  const pascal = toPascal(name);
  const Icon = lucideMap[pascal] ?? lucideMap[name] ?? Code2;
  return <Icon size={size} className={className} style={style} aria-hidden {...rest} />;
}
