/**
 * Pure YAML emit for the JSON → YAML tool. Same js-yaml `dump` settings as
 * the shared emitter, plus "Quote strings" (force-quote every string).
 */

import { dump } from "js-yaml";

export interface YamlEmitOptions {
  indent: number;
  lineWidth: number;
  sortKeys: boolean;
  quoteStrings: boolean;
}

export function jsonToYaml(value: unknown, o: YamlEmitOptions): string {
  return dump(value, {
    indent: o.indent,
    lineWidth: o.lineWidth,
    noRefs: true,
    sortKeys: o.sortKeys,
    flowLevel: -1,
    ...(o.quoteStrings ? { forceQuotes: true, quotingType: '"' as const } : {}),
  });
}
