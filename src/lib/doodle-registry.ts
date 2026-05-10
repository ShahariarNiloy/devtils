import type { ComponentType } from "react";
import { CalcDoodle } from '@/components/doodles/calc-doodle';
import { CodeDoodle } from '@/components/doodles/code-doodle';
import { ColorDoodle } from '@/components/doodles/color-doodle';
import { DataDoodle } from '@/components/doodles/data-doodle';
import { DesignDoodle } from '@/components/doodles/design-doodle';
import { EncodingDoodle } from '@/components/doodles/encoding-doodle';
import { ImageDoodle } from '@/components/doodles/image-doodle';
import { JsonDoodle } from '@/components/doodles/json-doodle';
import { NetworkDoodle } from '@/components/doodles/network-doodle';
import { NextDoodle } from '@/components/doodles/next-doodle';
import { PdfDoodle } from '@/components/doodles/pdf-doodle';
import { ReactDoodle } from '@/components/doodles/react-doodle';
import { RegexDoodle } from '@/components/doodles/regex-doodle';
import { SecurityDoodle } from '@/components/doodles/security-doodle';
import { TextDoodle } from '@/components/doodles/text-doodle';
import { ZodDoodle } from '@/components/doodles/zod-doodle';
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
