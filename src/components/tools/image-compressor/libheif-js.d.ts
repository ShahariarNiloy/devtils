// libheif-js ships an emscripten .d.ts for the low-level WASM module but
// not for the high-level `HeifDecoder` API, and the `wasm-bundle` subpath
// export has no declaration at all. We only consume it through a
// structural cast in `image-compressor.lib.ts` (see `LibheifModule`), so
// this ambient stub just satisfies module resolution.
declare module "libheif-js/wasm-bundle" {
  const libheif: unknown;
  export default libheif;
}
