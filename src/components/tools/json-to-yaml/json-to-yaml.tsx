"use client";

import { useCallback, useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  linesSummary,
  MenuCheck,
  MenuChoice,
  parseYaml,
  Segmented,
  ToggleChip,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/primitives/dropdown-menu";
import { byteLength } from "@/components/tools/json-formatter/json-formatter.lib";
import type { ConversionResult } from "@/components/tools/json-formatter/json-formatter.types";
import type { YamlOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToYamlContent, seoData } from "./content";
import { jsonToYaml } from "./json-to-yaml.lib";

const DEFAULT_JSON_INPUT = JSON.stringify(JSON_SAMPLES[3].value, null, 2);
const DEFAULT_YAML_INPUT = [
  "server:",
  "  host: 0.0.0.0",
  "  port: 3000",
  "features:",
  "  - auth",
  "  - billing",
  "  - analytics",
  "debug: false",
  "",
].join("\n");

const INDENTS = [
  ["2", "2 spaces"],
  ["4", "4 spaces"],
] as const;

const WIDTHS = [
  ["80", "80 columns"],
  ["120", "120 columns"],
  ["180", "180 columns"],
  ["-1", "No wrapping"],
] as const;

/**
 * JSON ↔ YAML. Forward (JSON → YAML): indent and Quote strings in the
 * toolbar; line width, sort keys and the direction swap in ⋯. Reverse
 * (YAML → JSON) parses with js-yaml and pretty-prints with the same indent.
 * Direction is URL state so a shared link opens in the right mode.
 */
export function JsonToYaml({ tool }: { tool: Tool }) {
  const [direction, setDirection] = useUrlState(
    "dir",
    enumCodec(["json-to-yaml", "yaml-to-json"] as const, "json-to-yaml"),
  );
  const [indent, setIndent] = useUrlState("indent", enumCodec(["2", "4"] as const, "2"));
  const [lineWidth, setLineWidth] = useUrlState("width", enumCodec(["80", "120", "180", "-1"] as const, "120"));
  const [sortKeys, setSortKeys] = useUrlState("sort", booleanCodec(false));
  const [quoteStrings, setQuoteStrings] = useUrlState("quote", booleanCodec(false));

  const forward = direction === "json-to-yaml";

  const yamlOptions = useMemo<YamlOptions>(
    () => ({ indent: Number(indent), lineWidth: Number(lineWidth), sortKeys }),
    [indent, lineWidth, sortKeys],
  );

  const convert = useCallback(
    (value: unknown): ConversionResult => {
      if (forward) {
        const output = jsonToYaml(value, {
          indent: Number(indent),
          lineWidth: Number(lineWidth),
          sortKeys,
          quoteStrings,
        });
        return { output, format: "yaml", size: byteLength(output) };
      }
      const text = JSON.stringify(value, null, Number(indent));
      return { output: text, format: "schema", size: byteLength(text) };
    },
    [forward, indent, lineWidth, sortKeys, quoteStrings],
  );

  const c = useConverter({
    convert,
    parseInput: forward ? undefined : parseYaml,
    // The worker only knows JSON input and the shared emitter's options.
    worker: forward && !quoteStrings ? { target: "yaml", options: yamlOptions } : undefined,
    initialInput: forward ? DEFAULT_JSON_INPUT : DEFAULT_YAML_INPUT,
  });

  const flipDirection = () => {
    // Carry the current output over so the user keeps their working text.
    const carryOver = c.output;
    setDirection(forward ? "yaml-to-json" : "json-to-yaml");
    if (carryOver) c.loadInput(carryOver);
  };

  return (
    <ConverterShell
      tool={tool}
      relatedSlugs={seoData.relatedSlugs}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      onLoadSample={(s) =>
        c.loadInput(
          forward
            ? JSON.stringify(s.value, null, 2)
            : jsonToYaml(s.value, { indent: 2, lineWidth: 120, sortKeys: false, quoteStrings: false }),
        )
      }
      inputLang={forward ? "json" : "yaml"}
      inputLabel={forward ? "JSON" : "YAML"}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang={forward ? "yaml" : "json"}
      outputLabel={forward ? "YAML" : "JSON"}
      summary={linesSummary(c.output)}
      statusVerb={forward ? "Generated" : "Converted"}
      downloadExt={forward ? "yaml" : "json"}
      downloadMime={forward ? "text/yaml" : "application/json"}
      downloadName={forward ? "config" : "data"}
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonToYamlContent />}
      toolbar={
        <>
          <Segmented label="Indent" value={indent} options={INDENTS} onChange={setIndent} />
          {forward && (
            <ToggleChip label="Quote strings" checked={quoteStrings} onChange={setQuoteStrings} hint="Wrap every string in double quotes" />
          )}
        </>
      }
      menu={
        <>
          <DropdownMenuItem onClick={flipDirection}>
            <ArrowLeftRight size={14} aria-hidden className="text-text-faint" />
            {forward ? "Swap to YAML → JSON" : "Swap to JSON → YAML"}
          </DropdownMenuItem>
          {forward && (
            <>
              <DropdownMenuSeparator />
              <MenuCheck label="Sort keys" hint="Alphabetical keys at every level" checked={sortKeys} onChange={setSortKeys} />
              <MenuChoice label="Line width" value={lineWidth} options={WIDTHS} onChange={setLineWidth} />
            </>
          )}
        </>
      }
    />
  );
}
