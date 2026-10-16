export function formatDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeStyle: "medium", timeZone: "America/La_Paz" }).format(new Date(value)) : "Sin registro";
}
export function formatNumber(value: number | null | undefined, decimals = 2) {
  return value == null ? "—" : new Intl.NumberFormat("es-BO", { maximumFractionDigits: decimals }).format(value);
}
