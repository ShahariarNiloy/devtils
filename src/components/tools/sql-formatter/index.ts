export { SqlFormatter } from "./sql-formatter";
export {
  COPY_AS_OPTIONS,
  DIALECTS,
  copyAs,
  detectDialect,
  format,
  getDialect,
  minify,
  statsFor,
} from "./sql-formatter.lib";
export type {
  CopyAsFormat,
  CopyAsOption,
  DialectDef,
  DialectId,
  FormatResult,
  SqlFormatOptions,
  SqlStats,
} from "./sql-formatter.lib";
