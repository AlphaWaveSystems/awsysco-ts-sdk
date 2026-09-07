/**
 * Injected at build time (see `tsup.config.ts`'s `define`) from
 * `package.json`'s `version` field, and mirrored for tests via
 * `vitest.config.ts`'s `define` so both see the same value.
 */
declare const __SDK_VERSION__: string;

export const SDK_VERSION: string = __SDK_VERSION__;
