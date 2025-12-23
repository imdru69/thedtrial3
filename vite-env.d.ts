/**
 * Manual type definitions for Vite environment when vite/client is not found.
 * This satisfies the compiler for import.meta.env and asset imports.
 */
interface ImportMetaEnv {
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const content: any;
  export default content;
}

declare module "*.png" {
  const content: any;
  export default content;
}

declare module "*.jpg" {
  const content: any;
  export default content;
}
