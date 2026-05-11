/**
 * Path-building helpers — pure, React-free. Lives in its own module so
 * non-UI callers (fuzzy search, codegen, schema infer) can use it without
 * dragging in React or the "use client" boundary that the tree-breadcrumb
 * component sits behind.
 */

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Append a single key or array index to a parent JSONPath. */
export function appendPath(
  parent: string,
  key: string,
  isArrayIndex: boolean,
): string {
  if (isArrayIndex) return `${parent}[${key}]`;
  if (IDENT.test(key)) return `${parent}.${key}`;
  return `${parent}[${JSON.stringify(key)}]`;
}
