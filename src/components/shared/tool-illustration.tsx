/**
 * ToolIllustration
 *
 * Dispatcher — maps a tool slug to its dedicated illustration component.
 * Each illustration lives in ./illustrations/ and is kept under 200 lines.
 *
 * Animation classes (ti-anim-* / ti-d*) and prefers-reduced-motion handling
 * are defined globally in src/app/globals.css.
 */

import { JsonIllustration } from "./illustrations/json-illustration";
import { ColorIllustration } from "./illustrations/color-illustration";
import { RegexIllustration } from "./illustrations/regex-illustration";
import { PdfIllustration } from "./illustrations/pdf-illustration";
import { ImageIllustration } from "./illustrations/image-illustration";
import { ZodIllustration } from "./illustrations/zod-illustration";
import { DefaultIllustration } from "./illustrations/default-illustration";

interface Props {
  /** Tool slug — determines which illustration renders */
  slug: string;
}

export function ToolIllustration({ slug }: Props) {
  switch (slug) {
    case "json-formatter":
      return <JsonIllustration />;
    case "color-converter":
      return <ColorIllustration />;
    case "regex-tester":
      return <RegexIllustration />;
    case "pdf-merger":
      return <PdfIllustration />;
    case "image-compressor":
      return <ImageIllustration />;
    case "zod-from-json":
      return <ZodIllustration />;
    default:
      return <DefaultIllustration />;
  }
}
