"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  Segmented,
  tableSummary,
  ToggleChip,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { byteLength } from "@/components/tools/json-formatter/json-formatter.lib";
import type { ConversionResult } from "@/components/tools/json-formatter/json-formatter.types";
import { toCSV } from "@/components/tools/json-formatter/json-convert";
import { rowsFromSample } from "@/components/tools/json-to-csv/json-to-csv.lib";
import type { Tool } from "@/lib/tools-registry";
import { CsvToJsonContent, seoData } from "./content";
import { csvToJson, SAMPLE_CSV, type CsvToJsonResult } from "./csv-to-json.lib";

const DELIMS = [
  ["auto", "Auto"],
  [",", ","],
  [";", ";"],
  ["tab", "Tab"],
] as const;

const PREVIEW_ROWS = 4;

function isResult(v: unknown): v is CsvToJsonResult {
  return v !== null && typeof v === "object" && "records" in v && "columns" in v;
}

/**
 * CSV → JSON. Toolbar: delimiter (auto-detected by default), header row,
 * type inference, and nesting of dotted columns. The output pane previews
 * the first rows as a table under the JSON.
 */
export function CsvToJson({ tool }: { tool: Tool }) {
  const [delimiter, setDelimiter] = useUrlState(
    "delim",
    enumCodec(["auto", ",", ";", "tab"] as const, "auto"),
  );
  const [header, setHeader] = useUrlState("header", booleanCodec(true));
  const [inferTypes, setInferTypes] = useUrlState("types", booleanCodec(true));
  const [nest, setNest] = useUrlState("nest", booleanCodec(true));

  const parseInput = useCallback(
    (text: string): CsvToJsonResult =>
      csvToJson(text, { delimiter, header, inferTypes, nest }),
    [delimiter, header, inferTypes, nest],
  );

  const convert = useCallback((value: unknown): ConversionResult => {
    const records = isResult(value) ? value.records : [];
    const output = JSON.stringify(records, null, 2);
    return { output, format: "schema", size: byteLength(output) };
  }, []);

  const c = useConverter({ convert, parseInput, initialInput: SAMPLE_CSV, acceptHandoff: false });

  const parsed = isResult(c.parse.parsed) ? c.parse.parsed : null;
  const preview = useMemo(
    () =>
      parsed
        ? { cols: parsed.columns, rows: parsed.rows.slice(0, PREVIEW_ROWS), totalRows: parsed.rows.length }
        : null,
    [parsed],
  );

  const detected =
    parsed && delimiter === "auto"
      ? `detected ${parsed.delimiter === "\t" ? "tab" : `“${parsed.delimiter}”`}`
      : undefined;

  return (
    <ConverterShell
      tool={tool}
      relatedSlugs={seoData.relatedSlugs}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      onLoadSample={(s) => {
        try {
          c.loadInput(toCSV(rowsFromSample(s.value), {}).output);
        } catch {
          c.loadInput(SAMPLE_CSV);
        }
      }}
      inputLang="csv"
      inputLabel="CSV"
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang="json"
      outputLabel="JSON"
      summary={parsed ? tableSummary(parsed.rows.length, parsed.columns.length) : ""}
      statusVerb="Converted"
      statusNote={detected}
      preview={preview}
      downloadExt="json"
      downloadMime="application/json"
      downloadName="data"
      conversionError={c.conversionError}
      content={<CsvToJsonContent />}
      toolbar={
        <>
          <Segmented label="Delimiter" value={delimiter} options={DELIMS} onChange={setDelimiter} />
          <ToggleChip label="Header row" checked={header} onChange={setHeader} hint="First row holds column names" />
          <ToggleChip label="Infer types" checked={inferTypes} onChange={setInferTypes} hint="Numbers, booleans and null instead of strings" />
          <ToggleChip label="Nest a.b columns" checked={nest} onChange={setNest} hint="stats.stars becomes { stats: { stars } }" />
        </>
      }
    />
  );
}
