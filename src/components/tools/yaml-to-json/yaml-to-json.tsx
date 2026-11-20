"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  linesSummary,
  parseYamlStream,
  Segmented,
  ToggleChip,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { byteLength } from "@/components/tools/json-formatter/json-formatter.lib";
import type { ConversionResult } from "@/components/tools/json-formatter/json-formatter.types";
import { jsonToYaml } from "@/components/tools/json-to-yaml/json-to-yaml.lib";
import type { Tool } from "@/lib/tools-registry";
import { seoData, YamlToJsonContent } from "./content";
import { countDocuments, SAMPLE_YAML, toJsonText } from "./yaml-to-json.lib";

const INDENTS = [
  ["2", "2 spaces"],
  ["4", "4 spaces"],
] as const;

/**
 * YAML → JSON. Parses with js-yaml's YAML 1.2 core schema (dates stay the
 * strings you wrote; merge keys are applied), turns a multi-document
 * stream into a JSON array, and reports parse errors with line + column.
 * Toolbar: indent and sort keys.
 */
export function YamlToJson({ tool }: { tool: Tool }) {
  const [indent, setIndent] = useUrlState("indent", enumCodec(["2", "4"] as const, "2"));
  const [sortKeys, setSortKeys] = useUrlState("sort", booleanCodec(false));

  const convert = useCallback(
    (value: unknown): ConversionResult => {
      const output = toJsonText(value, { indent: indent === "4" ? 4 : 2, sortKeys });
      return { output, format: "schema", size: byteLength(output) };
    },
    [indent, sortKeys],
  );

  const c = useConverter({
    convert,
    parseInput: parseYamlStream,
    initialInput: SAMPLE_YAML,
    acceptHandoff: false,
  });

  const docs = useMemo(() => (c.parse.error ? 0 : countDocuments(c.input)), [c.input, c.parse.error]);

  return (
    <ConverterShell
      tool={tool}
      relatedSlugs={seoData.relatedSlugs}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      onLoadSample={(s) =>
        c.loadInput(jsonToYaml(s.value, { indent: 2, lineWidth: 120, sortKeys: false, quoteStrings: false }))
      }
      inputLang="yaml"
      inputLabel="YAML"
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang="json"
      outputLabel="JSON"
      summary={linesSummary(c.output)}
      statusVerb="Converted"
      statusNote={docs > 1 ? `${docs} documents → array` : undefined}
      downloadExt="json"
      downloadMime="application/json"
      downloadName="data"
      conversionError={c.conversionError}
      content={<YamlToJsonContent />}
      toolbar={
        <>
          <Segmented label="Indent" value={indent} options={INDENTS} onChange={setIndent} />
          <ToggleChip label="Sort keys" checked={sortKeys} onChange={setSortKeys} hint="Alphabetical keys at every level" />
        </>
      }
    />
  );
}
