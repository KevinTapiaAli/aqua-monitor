import { openApiDocument } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(openApiDocument(), {
    headers: { "Cache-Control": "no-store" },
  });
}
