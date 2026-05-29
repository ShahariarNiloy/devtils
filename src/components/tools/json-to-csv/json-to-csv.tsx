"use client";

import { useCallback, useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  OptionDivider,
  OptionLabel,
  OptionsRow,
  parseCsv,
  stringCodec,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Switch } from "@/components/primitives/switch";
import { Tooltip } from "@/components/primitives/tooltip";
import { byteLength } from "@/components/tools/json-formatter/json-formatter.lib";
import type { ConversionResult } from "@/components/tools/json-formatter/json-formatter.types";
import {
  toCSV,
  type CsvOptions,
} from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToCsvContent } from "./content";

const apiResponse = JSON_SAMPLES[1].value as { data: unknown };
const DEFAULT_JSON_INPUT = JSON.stringify(apiResponse.data, null, 2);
const DEFAULT_CSV_INPUT = [
  "id,name,role,active",
  "1,Alice,admin,true",
  "2,Bob,user,true",
  "3,Carol,user,false",
  "",
].join("\n");

const DELIMITER_OPTIONS = [
  { label: "Comma (,)", value: "," },
  { label: "Tab (\\t)", value: "\t" },
  { label: "Semicolon (;)", value: ";" },
  { label: "Pipe (|)", value: "|" },
];

/**
 * Bidirectional JSON ↔ CSV tool. Forward mode owns the full options panel
 * (delimiter, flatten, BOM, CRLF). Reverse mode (CSV → JSON) reuses just the
 * delimiter + header toggle since the others are output-side concerns. The
 * direction is part of URL state so links round-trip.
 */
export function JsonToCsv({ tool }: { tool: Tool }) {
  const [direction, setDirection] = useUrlState(
    "dir",
    enumCodec(["json-to-csv", "csv-to-json"] as const, "json-to-csv"),
  );
  const [delimiter, setDelimiter] = useUrlState("delim", stringCodec(","));
  const [flattenDelimiter, setFlattenDelimiter] = useUrlState("flatten", stringCodec("."));
  const [includeHeader, setIncludeHeader] = useUrlState("header", booleanCodec(true));
  const [bom, setBom] = useUrlState("bom", booleanCodec(false));
  const [crlf, setCrlf] = useUrlState("crlf", booleanCodec(false));

  const forward = direction === "json-to-csv";

  const options = useMemo<CsvOptions>(
    () => ({
      delimiter,
      flattenDelimiter,
      includeHeader,
      bom,
      newline: crlf ? "\r\n" : "\n",
    }),
    [delimiter, flattenDelimiter, includeHeader, bom, crlf],
  );

  const convert = useCallback(
    (value: unknown): ConversionResult => {
      if (forward) return toCSV(value, options);
      // Reverse: render the parsed rows as pretty JSON.
      const text = JSON.stringify(value, null, 2);
      return { output: text, format: "schema", size: byteLength(text) };
    },
    [forward, options],
  );

  const csvParse = useCallback(
    (text: string) => parseCsv(text, { delimiter, includeHeader }),
    [delimiter, includeHeader],
  );

  const c = useConverter({
    convert,
    parseInput: forward ? undefined : csvParse,
    worker: forward ? { target: "csv", options } : undefined,
    initialInput: forward ? DEFAULT_JSON_INPUT : DEFAULT_CSV_INPUT,
  });

  const flipDirection = () => {
    const carryOver = c.output;
    setDirection(forward ? "csv-to-json" : "json-to-csv");
    if (carryOver) c.loadInput(carryOver);
  };

  return (
    <ConverterShell
      tool={tool}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      inputBytes={c.inputBytes}
      onLoadSample={(s) => {
        if (forward) {
          // Extract the first top-level array, or wrap a single value.
          const v = s.value as unknown;
          if (Array.isArray(v)) {
            c.loadInput(JSON.stringify(v, null, 2));
            return;
          }
          if (v && typeof v === "object") {
            const firstArr = Object.values(v as Record<string, unknown>).find(Array.isArray);
            if (firstArr) {
              c.loadInput(JSON.stringify(firstArr, null, 2));
              return;
            }
          }
          c.loadInput(JSON.stringify([v], null, 2));
        } else {
          // Reverse: load the sample as CSV by running it through toCSV first.
          try {
            const arr = (() => {
              const v = s.value as unknown;
              if (Array.isArray(v)) return v;
              if (v && typeof v === "object") {
                const firstArr = Object.values(v as Record<string, unknown>).find(Array.isArray);
                if (firstArr) return firstArr;
              }
              return [v];
            })();
            c.loadInput(toCSV(arr, options).output);
          } catch {
            c.loadInput(DEFAULT_CSV_INPUT);
          }
        }
      }}
      inputLang={forward ? "json" : "csv"}
      inputLabel={forward ? "JSON" : "CSV"}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang={forward ? "csv" : "json"}
      outputLabel={forward ? "CSV" : "JSON"}
      downloadExt={forward ? "csv" : "json"}
      downloadMime={forward ? "text/csv" : "application/json"}
      downloadName="data"
      conversionError={c.conversionError}
      content={<JsonToCsvContent />}
      optionsBar={
        <OptionsRow>
          <Tooltip
            content={forward ? "Switch to CSV → JSON" : "Switch to JSON → CSV"}
            side="bottom"
          >
            <button
              type="button"
              onClick={flipDirection}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-soft px-2.5 text-sm text-text hover:border-border-strong transition-colors"
              aria-label="Swap conversion direction"
            >
              <ArrowLeftRight size={13} />
              <span className="font-medium">{forward ? "JSON → CSV" : "CSV → JSON"}</span>
            </button>
          </Tooltip>

          <OptionDivider />

          <OptionLabel label="Delimiter">
            <Select value={delimiter} onValueChange={setDelimiter}>
              <SelectTrigger size="sm" className="h-8 w-[124px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIMITER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="Header row">
            <Switch
              checked={includeHeader}
              onCheckedChange={setIncludeHeader}
              aria-label="Include header row"
            />
          </OptionLabel>

          {forward && (
            <>
              <OptionDivider />
              <OptionLabel label="Flatten with">
                <input
                  value={flattenDelimiter}
                  onChange={(e) => setFlattenDelimiter(e.target.value.slice(0, 4) || ".")}
                  spellCheck={false}
                  className="h-8 w-16 rounded-md border border-border bg-surface-soft px-2 text-sm font-mono text-text outline-none focus:border-brand"
                  aria-label="Nested key delimiter"
                />
              </OptionLabel>

              <OptionDivider />

              <OptionLabel label="BOM">
                <Switch
                  checked={bom}
                  onCheckedChange={setBom}
                  aria-label="Prefix UTF-8 BOM"
                />
              </OptionLabel>

              <OptionDivider />

              <OptionLabel label="CRLF">
                <Switch
                  checked={crlf}
                  onCheckedChange={setCrlf}
                  aria-label="Use CRLF line endings"
                />
              </OptionLabel>
            </>
          )}
        </OptionsRow>
      }
    />
  );
}
