import "server-only";
import { z } from "zod";
import {
  calibrationSchema,
  deviceSchema,
  deviceUpdateSchema,
  ingestSchema,
  profileSchema,
  ruleSchema,
  sensorLimitsSchema,
} from "@/lib/validation";
import { parameters } from "@/types/domain";

type Schema = Record<string, unknown>;

// Reutiliza los contratos de entrada de la API. Las reglas entre campos de
// superRefine se explican en las descripciones porque JSON Schema no las expresa.
function fromZod(schema: z.ZodType) {
  const result = z.toJSONSchema(schema, { io: "input" });
  delete result.$schema;
  return result;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const uuid = { type: "string", format: "uuid" };
const timestamp = { type: "string", format: "date-time" };
const nullable = (schema: Schema) => ({ anyOf: [schema, { type: "null" }] });
const array = (name: string) => ({ type: "array", items: ref(name) });
const object = (properties: Record<string, Schema>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const dataResponse = (schema: Schema, description = "Operación completada.") => ({
  description,
  content: { "application/json": { schema: object({ data: schema }) } },
});
const body = (name: string) => ({
  required: true,
  content: { "application/json": { schema: ref(name) } },
});
const errors = {
  "400": "JSON incorrecto.",
  "401": "Se requiere una sesión válida o un token de dispositivo válido.",
  "403": "Operación no autorizada, origen incorrecto o dispositivo inactivo.",
  "404": "Registro no disponible para esta cuenta.",
  "409": "Conflicto con un registro existente.",
  "413": "El cuerpo JSON supera 16 KiB.",
  "415": "Se requiere Content-Type: application/json.",
  "422": "Datos incompatibles con el contrato o la especificación del sensor.",
  "429": "Demasiadas lecturas nuevas. Respetar Retry-After.",
  "500": "Error interno controlado.",
  "503": "Supabase no está configurado o no está disponible.",
};
function responses(schema: Schema, status = 200, codes = [401, 403, 422, 500, 503]) {
  return {
    [status]: dataResponse(schema),
    ...Object.fromEntries(codes.map((code) => [code, { $ref: `#/components/responses/Error${code}` }])),
  };
}
const deviceQuery = {
  name: "device_id", in: "query", required: true, schema: uuid,
  description: "UUID de un dispositivo autorizado para la sesión actual.",
};
const idPath = {
  name: "id", in: "path", required: true, schema: uuid,
  description: "UUID del recurso.",
};
const sessionSecurity = [{ CookieSession: [] }];
const mutationNote = "Requiere sesión del propietario y Origin igual a APP_URL. Swagger utiliza la sesión iniciada en /login, desde este mismo navegador.";

export function openApiDocument() {
  const ingest = fromZod(ingestSchema);
  const rule = fromZod(ruleSchema);
  const calibration = fromZod(calibrationSchema);
  let cookieName = "sb-project-ref-auth-token";
  try {
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];
    cookieName = `sb-${project}-auth-token`;
  } catch { /* La documentación también funciona antes de configurar Supabase. */ }

  return {
    openapi: "3.1.0",
    info: {
      title: "Aqua Monitor API",
      version: "2.0.0",
      description: [
        "API del sistema IoT multiparamétrico de condiciones ambientales.",
        "**Usuarios web:** inicia sesión en `/login` en este navegador. Las cookies se envían automáticamente; no introduzcas claves de Supabase en Authorize.",
        "**ESP32:** usa Authorize → DeviceToken y pega únicamente el token `aq_...` de tu dispositivo. Swagger añade el prefijo Bearer.",
        "Los cuerpos y valores de ejemplo describen el contrato; no representan mediciones físicas. Try it out ejecuta solicitudes reales sobre la base configurada.",
        "Respuesta correcta: `{ data: ... }`. Error: `{ error: { code, message, details? } }`. Sin configuración de Supabase, las operaciones privadas no están disponibles.",
      ].join("\n\n"),
    },
    servers: [{ url: "/", description: "Esta misma aplicación" }],
    tags: [
      { name: "Ingesta", description: "Transmisión del ESP32 con token propio." },
      { name: "Mediciones", description: "Consultas con sesión web y RLS." },
      { name: "Dispositivos", description: "Estaciones, estado y credenciales." },
      { name: "Alertas", description: "Eventos pendientes y reconocimiento." },
      { name: "Configuración", description: "Umbrales, calibraciones y perfil." },
    ],
    security: sessionSecurity,
    paths: {
      "/api/v1/ingest": {
        post: {
          tags: ["Ingesta"], operationId: "ingestMeasurement", summary: "Recibir una lectura del ESP32",
          description: "Máximo 16 KiB. Todos los campos principales son obligatorios; null expresa ausencia. Conserva reading_id y contenido al reintentar. Mismo ID y contenido: 200 sin duplicación; contenido distinto: 409. Nueva lectura: 201. Límite de una inserción nueva por segundo/dispositivo. La identidad procede exclusivamente del token. Sin un reloj sincronizado, measured_at debe ser null; no se permiten fechas anteriores a 2020 ni más de cinco minutos en el futuro. Calidad ok/out_of_range requiere un valor; missing/sensor_error requiere null. Datos sin calibrar van en raw. Humedad del suelo, MQ-135 y LDR en ADC normalizado 0–65535; no equivalen a humedad porcentual, CO₂ ppm ni lux. Los límites de cada modelo se configuran por dispositivo.",
          security: [{ DeviceToken: [] }], requestBody: body("IngestRequest"),
          responses: {
            ...responses(ref("IngestReceipt"), 201, [400, 401, 403, 409, 413, 415, 422, 429, 500, 503]),
            "200": dataResponse(ref("IngestReceipt"), "Lectura idéntica ya almacenada; duplicate = true."),
          },
        },
      },
      "/api/v1/measurements": {
        get: {
          tags: ["Mediciones"], operationId: "listMeasurements", summary: "Consultar historial paginado",
          description: "Orden recibido descendente por received_at e id. Periodo [from, to) por recepción, máximo 31 días; indica ambas fechas o ninguna. Sin fechas devuelve la ventana reciente. next_cursor es opaco. Sin autorización, la lista está vacía.",
          parameters: [deviceQuery,
            { name: "from", in: "query", schema: timestamp, description: "Inicio UTC incluido." },
            { name: "to", in: "query", schema: timestamp, description: "Fin UTC excluido." },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500, default: 120 } },
            { name: "cursor", in: "query", schema: { type: "string", maxLength: 300 }, description: "next_cursor de la respuesta anterior, conservando el resto de filtros." },
          ],
          responses: responses(object({ items: array("Measurement"), next_cursor: nullable({ type: "string" }), limit: { type: "integer" } })),
        },
      },
      "/api/v1/measurements/latest": {
        get: {
          tags: ["Mediciones"], operationId: "latestMeasurement", summary: "Obtener la última recepción",
          parameters: [deviceQuery], responses: responses(nullable(ref("Measurement"))),
        },
      },
      "/api/v1/devices": {
        get: {
          tags: ["Dispositivos"], operationId: "listDevices", summary: "Listar hasta 100 dispositivos autorizados",
          responses: responses(array("Device")),
        },
        post: {
          tags: ["Dispositivos"], operationId: "registerDevice", summary: "Registrar un dispositivo y emitir su token",
          description: "La sesión actual se convierte en propietaria. El token se entrega una sola vez; guarda únicamente su verificador en PostgreSQL. Requiere Origin igual a APP_URL.",
          requestBody: body("DeviceCreate"), responses: responses(object({ id: uuid, token: { type: "string", description: "Secreto individual. No se puede consultar de nuevo." } }), 201, [400, 401, 403, 409, 413, 415, 422, 500, 503]),
        },
      },
      "/api/v1/devices/{id}": {
        parameters: [idPath],
        patch: {
          tags: ["Dispositivos"], operationId: "updateDevice", summary: "Actualizar la estación y sus límites instrumentales",
          description: `${mutationNote} Debe enviarse al menos un campo. No admite cambiar propietario ni última recepción.`,
          requestBody: body("DeviceUpdate"), responses: responses(ref("Device"), 200, [400, 401, 403, 404, 413, 415, 422, 500, 503]),
        },
      },
      "/api/v1/devices/status": {
        get: {
          tags: ["Dispositivos"], operationId: "deviceStatus", summary: "Consultar el estado de transmisión",
          description: "online requiere recepción reciente: máximo entre 30 segundos y tres intervalos esperados. No depende solo de la existencia del dispositivo.",
          parameters: [deviceQuery], responses: responses(nullable(object({ device_id: uuid, status: { type: "string", enum: ["online", "offline", "waiting", "disabled"] }, last_received_at: nullable(timestamp), expected_interval_seconds: { type: "integer" } }))),
        },
      },
      "/api/v1/devices/{id}/credentials": {
        parameters: [idPath],
        post: {
          tags: ["Dispositivos"], operationId: "rotateDeviceToken", summary: "Rotar la credencial del dispositivo",
          description: `${mutationNote} Invalida el token anterior de inmediato y revela el nuevo una sola vez.`,
          responses: responses(object({ token: { type: "string" } })),
        },
        delete: {
          tags: ["Dispositivos"], operationId: "revokeDeviceToken", summary: "Revocar la credencial del dispositivo",
          description: `${mutationNote} Impide la ingesta hasta emitir una credencial nueva.`,
          responses: responses(object({ revoked: { type: "boolean", const: true } })),
        },
      },
      "/api/v1/alerts": {
        get: {
          tags: ["Alertas"], operationId: "listAlerts", summary: "Listar las 50 alertas pendientes más recientes",
          parameters: [deviceQuery], responses: responses(array("Alert")),
        },
      },
      "/api/v1/alerts/{id}/acknowledge": {
        parameters: [idPath],
        post: {
          tags: ["Alertas"], operationId: "acknowledgeAlert", summary: "Reconocer una alerta",
          description: `${mutationNote} Conserva el evento histórico. No certifica la condiciones ambientales.`,
          responses: responses(object({ acknowledged: { type: "boolean", const: true } }), 200, [401, 403, 404, 422, 500, 503]),
        },
      },
      "/api/v1/alert-rules": {
        get: {
          tags: ["Configuración"], operationId: "listAlertRules", summary: "Consultar umbrales de una estación",
          parameters: [deviceQuery], responses: responses(array("AlertRule")),
        },
        put: {
          tags: ["Configuración"], operationId: "saveAlertRule", summary: "Crear o actualizar un umbral por parámetro",
          description: `${mutationNote} Al menos un límite debe estar presente; mínimo < máximo si se indican ambos. Las unidades se asignan según el parámetro. Afecta futuras lecturas ok; no reescribe el historial.`,
          requestBody: body("AlertRuleInput"), responses: responses(ref("AlertRule"), 200, [400, 401, 403, 404, 409, 413, 415, 422, 500, 503]),
        },
      },
      "/api/v1/calibrations": {
        get: {
          tags: ["Configuración"], operationId: "listCalibrations", summary: "Consultar las 100 calibraciones más recientes",
          parameters: [deviceQuery], responses: responses(array("Calibration")),
        },
        post: {
          tags: ["Configuración"], operationId: "recordCalibration", summary: "Registrar evidencia de calibración",
          description: `${mutationNote} La fecha no puede ser futura; coeficientes limitados a 4096 caracteres JSON. No aplica automáticamente fórmulas al sensor.`,
          requestBody: body("CalibrationInput"), responses: responses(ref("Calibration"), 201, [400, 401, 403, 413, 415, 422, 500, 503]),
        },
      },
      "/api/v1/profile": {
        put: {
          tags: ["Configuración"], operationId: "saveProfile", summary: "Guardar el nombre del usuario actual",
          description: "Requiere sesión web y Origin igual a APP_URL. Solo cambia el perfil de esa sesión.",
          requestBody: body("ProfileInput"), responses: responses(object({ id: uuid, display_name: { type: "string" }, created_at: timestamp }), 200, [400, 401, 403, 409, 413, 415, 422, 500, 503]),
        },
      },
    },
    components: {
      securitySchemes: {
        DeviceToken: { type: "http", scheme: "bearer", bearerFormat: "aq_UUID.SECRETO", description: "Solo para POST /api/v1/ingest. Pega el token del ESP32 sin el prefijo Bearer. No se guarda en localStorage." },
        CookieSession: { type: "apiKey", in: "cookie", name: cookieName, description: "Inicia sesión en /login. El navegador gestiona las cookies Supabase (pueden dividirse en varios fragmentos); no pegues cookies ni claves en este campo." },
      },
      schemas: {
        IngestRequest: ingest,
        DeviceCreate: fromZod(deviceSchema),
        DeviceUpdate: fromZod(deviceUpdateSchema),
        AlertRuleInput: rule,
        CalibrationInput: calibration,
        ProfileInput: fromZod(profileSchema),
        IngestReceipt: object({ id: uuid, reading_id: uuid, received_at: timestamp, duplicate: { type: "boolean" } }),
        Device: object({
          id: uuid, owner_id: uuid, name: { type: "string" }, location: { type: "string" },
          is_active: { type: "boolean" }, expected_interval_seconds: { type: "integer" },
          last_received_at: nullable(timestamp), sensor_limits: fromZod(sensorLimitsSchema), created_at: timestamp,
        }),
        Measurement: object({
          ...ingest.properties, id: uuid, device_id: uuid, received_at: timestamp,
          created_at: timestamp, payload_hash: { type: "string", description: "Huella del contenido para idempotencia." },
        } as Record<string, Schema>),
        AlertRule: object({ ...rule.properties, id: uuid, unit: { type: "string" }, created_at: timestamp } as Record<string, Schema>),
        Calibration: object({ ...calibration.properties, id: uuid, created_by: uuid, created_at: timestamp } as Record<string, Schema>),
        Alert: object({
          id: uuid, device_id: uuid, measurement_id: uuid, rule_id: nullable(uuid),
          parameter: { type: "string", enum: parameters }, kind: { type: "string", enum: ["threshold", "sensor_error", "out_of_range"] },
          message: { type: "string" }, acknowledged_at: nullable(timestamp), acknowledged_by: nullable(uuid), created_at: timestamp,
        }),
        Error: {
          type: "object", required: ["error"], properties: { error: {
            type: "object", required: ["code", "message"], properties: {
              code: { type: "string" }, message: { type: "string" },
              details: { type: "array", items: object({ field: { type: "string" }, message: { type: "string" } }) },
            },
          } },
        },
      },
      responses: Object.fromEntries(Object.entries(errors).map(([code, description]) => [`Error${code}`, {
        description,
        content: { "application/json": { schema: ref("Error") } },
        ...(code === "429" ? { headers: { "Retry-After": { description: "Espera mínima en segundos.", schema: { type: "integer" } } } } : {}),
      }])),
    },
  };
}
