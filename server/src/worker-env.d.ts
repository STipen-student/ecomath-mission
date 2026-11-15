/** Deklarasi minimal modul bawaan Cloudflare Workers, cukup untuk typecheck. */
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
declare module 'cloudflare:node' {
  export function httpServerHandler(opsi: { port: number }): unknown;
}
