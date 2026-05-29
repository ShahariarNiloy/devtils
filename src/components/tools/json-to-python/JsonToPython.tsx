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
import {
  toPython,
  type PythonOptions,
} from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToPythonContent } from "./content";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

type ClassKind = NonNullable<PythonOptions["classKind"]>;

/**
 * JSON → Python tool. Offers three model flavours — stdlib `@dataclass`,
 * `TypedDict`, and Pydantic v2 `BaseModel` — picked by the consumer's
 * codebase conventions. Dataclass-with-slots is exposed as a separate
 * toggle since it's a meaningful perf knob (≈20% memory drop) but only
 * applies to that flavour.
 */
export function JsonToPython({ tool }: { tool: Tool }) {
  const [classKind, setClassKind] = useUrlState(
    "kind",
    enumCodec(["dataclass", "typeddict", "pydantic"] as const, "dataclass"),
  );
  const [useSlots, setUseSlots] = useUrlState("slots", booleanCodec(false));

  const options = useMemo<PythonOptions>(
    () => ({ classKind, useSlots: classKind === "dataclass" && useSlots }),
    [classKind, useSlots],
  );

  const convert = useCallback(
    (value: unknown) => toPython(value, options),
    [options],
  );

  const c = useConverter({
    convert,
    worker: { target: "python", options },
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
      outputLang="python"
      outputLabel="Python"
      downloadExt="py"
      downloadMime="text/x-python"
      downloadName="models"
      conversionError={c.conversionError}
      content={<JsonToPythonContent />}
      optionsBar={
        <OptionsRow>
          <OptionLabel label="Model">
            <Select value={classKind} onValueChange={(v) => setClassKind(v as ClassKind)}>
              <SelectTrigger size="sm" className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dataclass">@dataclass</SelectItem>
                <SelectItem value="typeddict">TypedDict</SelectItem>
                <SelectItem value="pydantic">Pydantic v2</SelectItem>
              </SelectContent>
            </Select>
          </OptionLabel>

          {classKind === "dataclass" && (
            <>
              <OptionDivider />
              <OptionLabel label="slots=True">
                <Switch
                  checked={useSlots}
                  onCheckedChange={setUseSlots}
                  aria-label="Emit slots=True for memory savings"
                />
              </OptionLabel>
            </>
          )}
        </OptionsRow>
      }
    />
  );
}
