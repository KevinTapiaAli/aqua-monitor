import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const assets = {
  "swagger-ui.css": "text/css; charset=utf-8",
  "swagger-ui-bundle.js": "application/javascript; charset=utf-8",
} as const;

export async function GET(_request: Request, context: { params: Promise<{ asset: string }> }) {
  const { asset } = await context.params;
  if (!Object.hasOwn(assets, asset)) return new Response("Not found", { status: 404 });

  // Solo dos archivos permitidos, sin resolver rutas proporcionadas libremente.
  const name = asset as keyof typeof assets;
  const content = await readFile(path.join(process.cwd(), "node_modules", "swagger-ui-dist", name));
  return new Response(new Uint8Array(content), {
    headers: {
      "Content-Type": assets[name],
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
