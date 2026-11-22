"use client";

import { useCallback, useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  booleanCodec,
  ConverterShell,
  csvPreview,
  enumCodec,
  JSON_SAMPLES,
  linesSummary,
  MenuCheck,
  MenuChoice,
  parseCsv,
  precisionWarning,
  Segmented,
  stringCodec,
  tableSummary,
  ToggleChip,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/primitives/dropdown-menu";
import { byteLength } from "@/components/tools/json-formatter/json-formatter.lib";
import type { ConversionResult } from "@/components/tools/json-formatter/json-formatter.types";
import { toCSV, type CsvOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToCsvContent, seoData } from "./content";
import { keepNestedAsJson, rowsFromSample } from "./json-to-csv.lib";

const apiResponse = JSON_SAMPLES[1].value as { data: unknown };
const DEFAULT_JSON_INPUT = JSON.stringify(apiResponse.data, null, 2);
const DEFAULT_CSV_INPUT = [
  "id,name,role,active",
  "1,Alice,admin,true",
  "2,Bob,user,true",
  "3,Carol,user,false",
  "",
].join("\n");

const DELIMS = [
  [",", "Comma"],
  [";", "Semicolon"],
  ["\t", "Tab"],
] as const;
const MORE_DELIMS = [["|", "Pipe ( | )"]] as const;

const JOINERS = [
  [".", "a.b"],
  ["_", "a_b"],
  ["__", "a__b"],
  ["/", "a/b"],
] as const;

/**
 * JSON ↔ CSV. Forward: delimiter, header row and "flatten nested" in the
 * toolbar, with a preview table of the first rows; key joiner, BOM, CRLF,
 * the pipe delimiter and the direction swap in ⋯. Reverse (CSV → JSON)
 * keeps delimiter + header. Direction is URL state.
 */
export function JsonToCsv({ tool }: { tool: Tool }) {
  const [direction, setDirection] = useUrlState(
    "dir",
    enumCodec(["json-to-csv", "csv-to-json"] as const, "json-to-csv"),
  );
  const [delimiter, setDelimiter] = useUrlState("delim", enumCodec([",", ";", "\t", "|"] as const, ","));
  const [flattenDelimiter, setFlattenDelimiter] = useUrlState("flatten", stringCodec("."));
  const [flattenNested, setFlattenNested] = useUrlState("nested", booleanCodec(true));
  const [includeHeader, setIncludeHeader] = useUrlState("header", booleanCodec(true));
  const [bom, setBom] = useUrlState("bom", booleanCodec(false));
  const [crlf, setCrlf] = useUrlState("crlf", booleanCodec(false));

  const forward = direction === "json-to-csv";

  const options = useMemo<CsvOptions>(
    () => ({
      delimiter,
      flattenDelimiter: flattenDelimiter.slice(0, 4) || ".",
      includeHeader,
      bom,
      newline: crlf ? "\r\n" : "\n",
    }),
    [delimiter, flattenDelimiter, includeHeader, bom, crlf],
  );

  const convert = useCallback(
    (value: unknown): ConversionResult => {
      if (forward) return toCSV(flattenNested ? value : keepNestedAsJson(value), options);
      const text = JSON.stringify(value, null, 2);
      return { output: text, format: "schema", size: byteLength(text) };
    },
    [forward, flattenNested, options],
  );

  const csvParse = useCallback(
    (text: string) => parseCsv(text, { delimiter, includeHeader }),
    [delimiter, includeHeader],
  );

  const c = useConverter({
    convert,
    parseInput: forward ? undefined : csvParse,
    // The worker always flattens and only parses JSON.
    worker: forward && flattenNested ? { target: "csv", options } : undefined,
    initialInput: forward ? DEFAULT_JSON_INPUT : DEFAULT_CSV_INPUT,
  });

  const preview = useMemo(() => {
    if (forward) return csvPreview(c.output, delimiter, includeHeader, 5);
    if (c.parse.error) return null;
    return csvPreview(c.input, delimiter, includeHeader, 4);
  }, [forward, c.output, c.input, c.parse.error, delimiter, includeHeader]);

  const flipDirection = () => {
    const carryOver = c.output;
    setDirection(forward ? "csv-to-json" : "json-to-csv");
    if (carryOver) c.loadInput(carryOver);
  };

  const loadSample = (v: unknown) => {
    const rows = rowsFromSample(v);
    if (forward) {
      c.loadInput(JSON.stringify(rows, null, 2));
      return;
    }
    try {
      c.loadInput(toCSV(rows, options).output);
    } catch {
      c.loadInput(DEFAULT_CSV_INPUT);
    }
  };

  return (
    <ConverterShell
      tool={tool}
      relatedSlugs={seoData.relatedSlugs}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      onLoadSample={(s) => loadSample(s.value)}
      inputLang={forward ? "json" : "csv"}
      inputLabel={forward ? "JSON" : "CSV"}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang={forward ? "csv" : "json"}
      outputLabel={forward ? "CSV" : "JSON"}
      summary={preview ? tableSummary(preview.totalRows, preview.cols.length) : linesSummary(c.output)}
      statusVerb={forward ? "Generated" : "Converted"}
      preview={preview}
      downloadExt={forward ? "csv" : "json"}
      downloadMime={forward ? "text/csv" : "application/json"}
      downloadName="data"
      conversionError={c.conversionError}
      warning={precisionWarning(c.parse.lossy, String)}
      isComputing={c.isComputing}
      content={<JsonToCsvContent />}
      toolbar={
        <>
          <Segmented label="Delimiter" value={delimiter} options={DELIMS} onChange={setDelimiter} />
          <ToggleChip label="Header row" checked={includeHeader} onChange={setIncludeHeader} hint="First row holds column names" />
          {forward && (
            <ToggleChip
              label="Flatten nested"
              checked={flattenNested}
              onChange={setFlattenNested}
              hint="Nested objects become a.b columns (off: JSON in one cell)"
            />
          )}
        </>
      }
      menu={
        <>
          <DropdownMenuItem onClick={flipDirection}>
            <ArrowLeftRight size={14} aria-hidden className="text-text-faint" />
            {forward ? "Swap to CSV → JSON" : "Swap to JSON → CSV"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <MenuChoice label="Other delimiter" value={delimiter} options={MORE_DELIMS} onChange={setDelimiter} />
          {forward && (
            <>
              {flattenNested && (
                <MenuChoice label="Nested key joiner" value={flattenDelimiter} options={JOINERS} onChange={setFlattenDelimiter} />
              )}
              <DropdownMenuSeparator />
              <MenuCheck label="UTF-8 BOM" hint="Helps Excel detect the encoding" checked={bom} onChange={setBom} />
              <MenuCheck label="CRLF line endings" hint="Windows-style \r\n" checked={crlf} onChange={setCrlf} />
            </>
          )}
        </>
      }
    />
  );
}
