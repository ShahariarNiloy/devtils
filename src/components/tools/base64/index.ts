export { Base64 } from './base64';
export { useBase64 } from "./use-base64";
export * from "./base64.types";
export {
  encode,
  decode,
  decodeToBytes,
  detectIsBase64,
  detectVariant,
  validateBase64,
  stripWhitespace,
  autoPadding,
  toDataUri,
  fromDataUri,
  encodeFile,
  hexDump,
  generateShareUrl,
  roundTripCheck,
  PRESETS,
} from "./base64.lib";
