"use client";

import { useCallback, useMemo } from "react";
import {
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  OptionLabel,
  OptionsRow,
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
import {
  toJsonSchema,
  type JsonSchemaOptions,
} from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonSchemaContent } from "./content";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

type Draft = NonNullable<JsonSchemaOptions["draft"]>;

/**
 * JSON Schema generator. Walks the sample once, infers a `draft 2020-12`
 * schema (or `draft-07` for compatibility with older validators) with
 * format-aware string detection. Required fields are the intersection of
 * keys observed across array items, so a list of mostly-uniform records
 * gets accurate required/optional separation automatically.
 */
export function JsonSchema({ tool }: { tool: Tool }) {
  const [draft, setDraft] = useUrlState(
    "draft",
    enumCodec(["2020-12", "draft-07"] as const, "2020-12"),
  );

  const options = useMemo<JsonSchemaOptions>(() => ({ draft }), [draft]);

  const convert = useCallback(
    (value: unknown) => toJsonSchema(value, options),
    [options],
  );

  const c = useConverter({
    convert,
    worker: { target: "schema", options },
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
      outputLang="json"
      outputLabel="JSON Schema"
      downloadExt="json"
      downloadMime="application/schema+json"
      downloadName="schema"
      conversionError={c.conversionError}
      content={<JsonSchemaContent />}
      optionsBar={
        <OptionsRow>
          <OptionLabel label="Draft">
            <Select value={draft} onValueChange={(v) => setDraft(v as Draft)}>
              <SelectTrigger size="sm" className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2020-12">2020-12 (latest)</SelectItem>
                <SelectItem value="draft-07">draft-07</SelectItem>
              </SelectContent>
            </Select>
          </OptionLabel>
        </OptionsRow>
      }
    />
  );
}
