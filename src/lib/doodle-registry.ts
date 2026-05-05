import type { ComponentType } from "react";
import { CalcDoodle } from "@/components/doodles/CalcDoodle";
import { CodeDoodle } from "@/components/doodles/CodeDoodle";
import { ColorDoodle } from "@/components/doodles/ColorDoodle";
import { DataDoodle } from "@/components/doodles/DataDoodle";
import { DesignDoodle } from "@/components/doodles/DesignDoodle";
import { EncodingDoodle } from "@/components/doodles/EncodingDoodle";
import { ImageDoodle } from "@/components/doodles/ImageDoodle";
import { JsonDoodle } from "@/components/doodles/JsonDoodle";
import { NetworkDoodle } from "@/components/doodles/NetworkDoodle";
import { NextDoodle } from "@/components/doodles/NextDoodle";
import { PdfDoodle } from "@/components/doodles/PdfDoodle";
import { ReactDoodle } from "@/components/doodles/ReactDoodle";
import { RegexDoodle } from "@/components/doodles/RegexDoodle";
import { SecurityDoodle } from "@/components/doodles/SecurityDoodle";
import { TextDoodle } from "@/components/doodles/TextDoodle";
import { ZodDoodle } from "@/components/doodles/ZodDoodle";
import { CATEGORY_META, type ToolCategory } from "./tools-registry";

export interface DoodleProps {
  className?: string;
  stroke?: string;
}

export type DoodleComponent = ComponentType<DoodleProps>;

/**
 * Map of every doodle component name (the `doodleComponent` string in
 * CATEGORY_META) to its actual React component. When you add a new doodle,
 * register it here with the same name used in tools-registry.
 */
export const DOODLES_BY_NAME: Record<string, DoodleComponent> = {
  CalcDoodle,
  CodeDoodle,
  ColorDoodle,
  DataDoodle,
  DesignDoodle,
  EncodingDoodle,
  ImageDoodle,
  JsonDoodle,
  NetworkDoodle,
  NextDoodle,
  PdfDoodle,
  ReactDoodle,
  RegexDoodle,
  SecurityDoodle,
  TextDoodle,
  ZodDoodle,
};

/**
 * Look up the doodle component for a given category. Falls back to
 * CodeDoodle if the registered component name isn't found — this only
 * happens if CATEGORY_META is misconfigured.
 */
export function getDoodle(category: ToolCategory): DoodleComponent {
  const name = CATEGORY_META[category]?.doodleComponent;
  return DOODLES_BY_NAME[name] ?? CodeDoodle;
}
