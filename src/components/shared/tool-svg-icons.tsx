// Barrel re-export — import from this file as before.
export type { IconProps } from "./tool-svg-icons-a";
export {
  Icon,
  JsonFormatter,
  RegexTester,
  ColorConverter,
  Base64,
  CaseConverter,
  JwtDecoder,
  UrlEncoder,
  UrlParser,
  TimestampConverter,
  UuidGenerator,
} from "./tool-svg-icons-a";

export {
  DiffChecker,
  MarkdownPreview,
  PasswordGenerator,
  HtmlEntity,
  YamlToJson,
  WordCounter,
  CronParser,
  SqlFormatter,
  CsvToJson,
  ChmodCalculator,
} from "./tool-svg-icons-b";

import type { IconProps } from "./tool-svg-icons-a";
import {
  JsonFormatter,
  RegexTester,
  ColorConverter,
  Base64,
  CaseConverter,
  JwtDecoder,
  UrlEncoder,
  UrlParser,
  TimestampConverter,
  UuidGenerator,
} from "./tool-svg-icons-a";
import {
  DiffChecker,
  MarkdownPreview,
  PasswordGenerator,
  HtmlEntity,
  YamlToJson,
  WordCounter,
  CronParser,
  SqlFormatter,
  CsvToJson,
  ChmodCalculator,
} from "./tool-svg-icons-b";

export const CUSTOM_TOOL_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  "json-formatter": JsonFormatter,
  "regex-tester": RegexTester,
  "color-converter": ColorConverter,
  "base64": Base64,
  "case-converter": CaseConverter,
  "jwt-decoder": JwtDecoder,
  "url-encoder": UrlEncoder,
  "url-parser": UrlParser,
  "timestamp-converter": TimestampConverter,
  "uuid-generator": UuidGenerator,
  "diff-checker": DiffChecker,
  "markdown-preview": MarkdownPreview,
  "password-generator": PasswordGenerator,
  "html-entity": HtmlEntity,
  "yaml-to-json": YamlToJson,
  "word-counter": WordCounter,
  "cron-parser": CronParser,
  "sql-formatter": SqlFormatter,
  "csv-to-json": CsvToJson,
  "chmod-calculator": ChmodCalculator,
};
