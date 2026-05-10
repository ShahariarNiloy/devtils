export type Base64Variant = "standard" | "url-safe" | "mime" | "pem";
export type Direction = "encode" | "decode";
export type Charset = "utf-8" | "latin-1" | "ascii";
export type OutputTab = "text" | "hex" | "data-uri" | "diff" | "image";

export interface EncodeOptions {
  variant: Base64Variant;
  charset: Charset;
}

export interface DecodeOptions {
  variant: Base64Variant;
  charset: Charset;
  stripWhitespace: boolean;
  autoPad: boolean;
}

export interface EncodeResult {
  output: string;
  inputBytes: number;
  outputChars: number;
  /** Percentage size change vs input bytes; positive for growth, negative for shrink. */
  sizeDelta: number;
  roundTripOk: boolean;
}

export interface DecodeResult {
  output: string;
  outputBytes: Uint8Array;
  inputChars: number;
  /** Number of bytes the decode produced. Trailing underscore matches spec; do not rename. */
  outputBytes_: number;
  sizeDelta: number;
  isImage: boolean;
  imageMime?: string;
  roundTripOk: boolean;
}

export interface ValidationError {
  message: string;
  position?: number;
  char?: string;
  hint?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
}

export interface HexRow {
  offset: string;
  hex: string;
  ascii: string;
}

export interface FileInfo {
  name: string;
  mime: string;
  size: number;
  bytes: Uint8Array;
}

export interface PresetItem {
  id: string;
  label: string;
  /** Lucide icon name. The orchestrator maps it to a component. */
  icon: string;
  input: string;
  direction: Direction;
  variant: Base64Variant;
  description: string;
}
