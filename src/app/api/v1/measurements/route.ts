import { listMeasurements } from "@/lib/api/measurements";
import { route, success } from "@/lib/api/http";

export const GET = route(async (request) => success(await listMeasurements(request)));
