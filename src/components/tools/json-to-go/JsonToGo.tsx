"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  OptionDivider,
  OptionLabel,
  OptionsRow,
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
import { toGo, type GoOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToGoContent } from "./content";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

const GO_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * JSON → Go structs tool. Owns the package name, json-tag style, and
 * omitempty toggle. The emitter generates pointer-with-omitempty for
 * optional fields and `*T` for nullable values, matching the encoding/json
 * idiom — no opinion knobs needed beyond what's in the OptionsRow.
 */
export function JsonToGo({ tool }: { tool: Tool }) {
  const [packageName, setPackageName] = useUrlState("pkg", stringCodec("main"));
  const [jsonTagStyle, setJsonTagStyle] = useUrlState(
    "tags",
    enumCodec(["original", "snake", "camel"] as const, "original"),
  );
  const [omitemptyOnOptional, setOmitemptyOnOptional] = useUrlState(
    "omitempty",
    booleanCodec(true),
  );

  const safePackage = useMemo(
    () => (GO_IDENT.test(packageName) ? packageName : "main"),
    [packageName],
  );

  const options = useMemo<GoOptions>(
    () => ({ packageName: safePackage, jsonTagStyle, omitemptyOnOptional }),
    [safePackage, jsonTagStyle, omitemptyOnOptional],
  );

  const convert = useCallback(
    (value: unknown) => toGo(value, options),
    [options],
  );

  const c = useConverter({
    convert,
    worker: { target: "go", options },
    initialInput: DEFAULT_INPUT,
  });

  return (
    <ConverterShell
      tool={tool}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      inputBytes={c.inputBytes}
      onLoadSample={(s) => c.loadInput(JSON.stringify(s.value, null, 2))}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang="go"
      outputLabel="Go"
      downloadExt="go"
      downloadMime="text/x-go"
      downloadName={`${safePackage}_types`}
      conversionError={c.conversionError}
      content={<JsonToGoContent />}
      optionsBar={
        <OptionsRow>
          <OptionLabel label="package">
            <input
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              className="h-8 w-32 rounded-md border border-border bg-surface-soft px-2 text-sm font-mono text-text outline-none focus:border-brand"
              aria-label="Go package name"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="json tags">
            <Select
              value={jsonTagStyle}
              onValueChange={(v) => setJsonTagStyle(v as typeof jsonTagStyle)}
            >
              <SelectTrigger size="sm" className="h-8 w-[124px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="snake">snake_case</SelectItem>
                <SelectItem value="camel">camelCase</SelectItem>
              </SelectContent>
            </Select>
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="omitempty">
            <Switch
              checked={omitemptyOnOptional}
              onCheckedChange={setOmitemptyOnOptional}
              aria-label="Add ,omitempty to optional fields"
            />
          </OptionLabel>
        </OptionsRow>
      }
    />
  );
}
