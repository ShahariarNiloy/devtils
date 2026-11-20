/**
 * Post-processing for the shared Rust emitter (pure, no React).
 */

/** Remove `pub` from structs and fields (private, module-local types). */
export function stripPub(rs: string): string {
  return rs.replace(/^pub struct /gm, "struct ").replace(/^(\s+)pub /gm, "$1");
}

/** Remove `Clone` from every `#[derive(...)]` list. */
export function stripClone(rs: string): string {
  return rs.replace(/^#\[derive\(([^)]*)\)\]$/gm, (_, list: string) => {
    const kept = list
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "Clone");
    return `#[derive(${kept.join(", ")})]`;
  });
}

export function countStructs(rs: string): number {
  return (rs.match(/^(?:pub )?struct \w+/gm) ?? []).length;
}
