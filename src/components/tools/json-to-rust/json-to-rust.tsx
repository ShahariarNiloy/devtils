"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  JSON_SAMPLES,
  OptionDivider,
  OptionLabel,
  OptionsRow,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { Switch } from "@/components/primitives/switch";
import {
  toRust,
  type RustOptions,
} from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToRustContent } from "./content";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

/**
 * JSON → Rust serde structs tool. Defaults derive `Serialize`, `Deserialize`,
 * `Debug`, `Clone`; the toggles let users add `Default`/`PartialEq` or turn
 * on `deny_unknown_fields` for strict deserialisation. The emitter handles
 * snake_case renaming with serde rename attributes when the source key isn't
 * snake_case.
 */
export function JsonToRust({ tool }: { tool: Tool }) {
  const [deriveDefault, setDeriveDefault] = useUrlState("default", booleanCodec(false));
  const [derivePartialEq, setDerivePartialEq] = useUrlState("partialEq", booleanCodec(false));
  const [denyUnknownFields, setDenyUnknownFields] = useUrlState(
    "denyUnknown",
    booleanCodec(false),
  );

  const options = useMemo<RustOptions>(() => {
    const extraDerives: string[] = [];
    if (deriveDefault) extraDerives.push("Default");
    if (derivePartialEq) extraDerives.push("PartialEq");
    return { extraDerives, denyUnknownFields };
  }, [deriveDefault, derivePartialEq, denyUnknownFields]);

  const convert = useCallback(
    (value: unknown) => toRust(value, options),
    [options],
  );

  const c = useConverter({
    convert,
    worker: { target: "rust", options },
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
      outputLang="rust"
      outputLabel="Rust"
      downloadExt="rs"
      downloadMime="text/x-rust"
      downloadName="types"
      conversionError={c.conversionError}
      content={<JsonToRustContent />}
      optionsBar={
        <OptionsRow>
          <OptionLabel label="Default">
            <Switch
              checked={deriveDefault}
              onCheckedChange={setDeriveDefault}
              aria-label="Add Default to derive list"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="PartialEq">
            <Switch
              checked={derivePartialEq}
              onCheckedChange={setDerivePartialEq}
              aria-label="Add PartialEq to derive list"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="deny_unknown_fields">
            <Switch
              checked={denyUnknownFields}
              onCheckedChange={setDenyUnknownFields}
              aria-label="Reject extra fields during deserialization"
            />
          </OptionLabel>
        </OptionsRow>
      }
    />
  );
}
