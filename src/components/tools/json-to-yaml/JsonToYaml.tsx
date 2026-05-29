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
  parseYaml,
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
  toYAML,
  type YamlOptions,
} from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToYamlContent } from "./content";

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

/**
 * Bidirectional JSON ↔ YAML tool. Forward direction (JSON → YAML) uses the
 * full options bar (indent, line width, sort keys). Reverse direction
 * (YAML → JSON) is simpler — js-yaml.load handles the parse, JSON.stringify
 * with the same indent renders the output. The direction toggle is itself a
 * URL state, so a shared link round-trips to the right mode.
 */
export function JsonToYaml({ tool }: { tool: Tool }) {
  const [direction, setDirection] = useUrlState(
    "dir",
    enumCodec(["json-to-yaml", "yaml-to-json"] as const, "json-to-yaml"),
  );
  const [indent, setIndent] = useUrlState("indent", stringCodec("2"));
  const [lineWidth, setLineWidth] = useUrlState("width", stringCodec("120"));
  const [sortKeys, setSortKeys] = useUrlState("sort", booleanCodec(false));

  const forward = direction === "json-to-yaml";

  const yamlOptions = useMemo<YamlOptions>(
    () => ({
      indent: Number(indent),
      lineWidth: Number(lineWidth),
      sortKeys,
    }),
    [indent, lineWidth, sortKeys],
  );

  const convert = useCallback(
    (value: unknown): ConversionResult => {
      if (forward) return toYAML(value, yamlOptions);
      const indented = Number(indent);
      const text = JSON.stringify(value, null, indented);
      return { output: text, format: "schema", size: byteLength(text) };
    },
    [forward, yamlOptions, indent],
  );

  const c = useConverter({
    convert,
    parseInput: forward ? undefined : parseYaml,
    // Worker only knows JSON.parse, so disable for reverse direction.
    worker: forward ? { target: "yaml", options: yamlOptions } : undefined,
    initialInput: forward ? DEFAULT_JSON_INPUT : DEFAULT_YAML_INPUT,
  });

  const flipDirection = () => {
    // Move the current output into the input pane so the user keeps their
    // working text when toggling direction.
    const carryOver = c.output;
    setDirection(forward ? "yaml-to-json" : "json-to-yaml");
    if (carryOver) c.loadInput(carryOver);
  };

  return (
    <ConverterShell
      tool={tool}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      inputBytes={c.inputBytes}
      onLoadSample={(s) =>
        c.loadInput(
          forward
            ? JSON.stringify(s.value, null, 2)
            : (() => {
                try {
                  return toYAML(s.value, yamlOptions).output;
                } catch {
                  return JSON.stringify(s.value, null, 2);
                }
              })(),
        )
      }
      inputLang={forward ? "json" : "yaml"}
      inputLabel={forward ? "JSON" : "YAML"}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang={forward ? "yaml" : "json"}
      outputLabel={forward ? "YAML" : "JSON"}
      downloadExt={forward ? "yaml" : "json"}
      downloadMime={forward ? "text/yaml" : "application/json"}
      downloadName={forward ? "config" : "data"}
      conversionError={c.conversionError}
      content={<JsonToYamlContent />}
      optionsBar={
        <OptionsRow>
          <Tooltip
            content={forward ? "Switch to YAML → JSON" : "Switch to JSON → YAML"}
            side="bottom"
          >
            <button
              type="button"
              onClick={flipDirection}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-soft px-2.5 text-sm text-text hover:border-border-strong transition-colors"
              aria-label="Swap conversion direction"
            >
              <ArrowLeftRight size={13} />
              <span className="font-medium">{forward ? "JSON → YAML" : "YAML → JSON"}</span>
            </button>
          </Tooltip>

          <OptionDivider />

          <OptionLabel label="Indent">
            <Select value={indent} onValueChange={setIndent}>
              <SelectTrigger size="sm" className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </OptionLabel>

          {forward && (
            <>
              <OptionDivider />

              <OptionLabel label="Line width">
                <Select value={lineWidth} onValueChange={setLineWidth}>
                  <SelectTrigger size="sm" className="h-8 w-[88px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80</SelectItem>
                    <SelectItem value="120">120</SelectItem>
                    <SelectItem value="180">180</SelectItem>
                    <SelectItem value="-1">∞</SelectItem>
                  </SelectContent>
                </Select>
              </OptionLabel>

              <OptionDivider />

              <OptionLabel label="Sort keys">
                <Switch
                  checked={sortKeys}
                  onCheckedChange={setSortKeys}
                  aria-label="Sort object keys alphabetically"
                />
              </OptionLabel>
            </>
          )}
        </OptionsRow>
      }
    />
  );
}
