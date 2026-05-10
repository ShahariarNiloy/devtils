import * as LucideIcons from "lucide-react";
import { Code2, type LucideIcon } from "lucide-react";

const lucideMap = LucideIcons as unknown as Record<string, LucideIcon>;

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

export function ToolIcon({ name, size = 16, className, style, ...rest }: Props) {
  const pascal = toPascal(name);
  const Icon = lucideMap[pascal] ?? lucideMap[name] ?? Code2;
  return <Icon size={size} className={className} style={style} aria-hidden {...rest} />;
}
