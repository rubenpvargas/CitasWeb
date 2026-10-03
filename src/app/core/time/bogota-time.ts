/**
 * Utilidades de fecha/hora según la DECISIÓN "Tiempo y zona horaria": la agenda
 * usa hora local de pared de America/Bogota, serializada ISO-8601 sin offset
 * (`YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm:ss`). El cliente nunca convierte
 * estas cadenas a otra zona; solo las formatea.
 */
export const APP_TIME_ZONE = 'America/Bogota';
export const MAX_RANGE_DAYS = 31;

function parts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
}

/** Fecha actual en Bogotá como `YYYY-MM-DD`. */
export function todayInBogota(now: Date = new Date()): string {
  const p = parts(now);
  return `${p['year']}-${p['month']}-${p['day']}`;
}

/** Fecha y hora actual en Bogotá como `YYYY-MM-DDTHH:mm`. */
export function nowInBogota(now: Date = new Date()): string {
  const p = parts(now);
  return `${p['year']}-${p['month']}-${p['day']}T${p['hour']}:${p['minute']}`;
}

/** Suma días a una fecha `YYYY-MM-DD` sin depender de la zona del navegador. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Días entre dos fechas `YYYY-MM-DD` (to - from). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** `HH:mm` a partir de `HH:mm` o `HH:mm:ss`. */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** Hora de una marca local `YYYY-MM-DDTHH:mm[:ss]` como `HH:mm`. */
export function timeOf(localDateTime: string): string {
  return localDateTime.slice(11, 16);
}

/** Fecha de una marca local `YYYY-MM-DDTHH:mm[:ss]`. */
export function dateOf(localDateTime: string): string {
  return localDateTime.slice(0, 10);
}

/** "jueves, 24 de octubre de 2026" para una fecha `YYYY-MM-DD`, sin conversión de zona. */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "jue 24 oct" para una fecha `YYYY-MM-DD`. */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** Horas válidas en `:00`/`:30` para selectores (`06:00` … `21:30`). */
export function halfHourOptions(fromHour = 6, toHour = 22): string[] {
  const out: string[] = [];
  for (let h = fromHour; h <= toHour; h++) {
    for (const m of ['00', '30']) {
      if (h === toHour && m === '30') continue;
      out.push(`${String(h).padStart(2, '0')}:${m}`);
    }
  }
  return out;
}

/** `true` si la hora `HH:mm` está alineada a `:00` o `:30`. */
export function isHalfHourAligned(time: string): boolean {
  return /^\d{2}:(00|30)(:00)?$/.test(time);
}
