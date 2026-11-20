/**
 * Pure helpers for the JSON → Python tool.
 */

/** Python identifier for the root class; falls back to `Root`. */
export function safeClassName(name: string): string {
  const trimmed = name.trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed) ? trimmed : "Root";
}

export function countClasses(py: string): number {
  return (py.match(/^class \w+/gm) ?? []).length;
}
