import {
  addDays,
  daysBetween,
  formatLongDate,
  halfHourOptions,
  hhmm,
  isHalfHourAligned,
  nowInBogota,
  timeOf,
  todayInBogota,
} from './bogota-time';

describe('bogota-time', () => {
  it('calcula la fecha/hora de pared en America/Bogota (UTC-5)', () => {
    const instant = new Date('2026-10-03T03:30:00Z'); // 2 oct 22:30 en Bogotá
    expect(todayInBogota(instant)).toBe('2026-10-02');
    expect(nowInBogota(instant)).toBe('2026-10-02T22:30');
  });

  it('suma y resta días sin depender de la zona del navegador', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
  });

  it('formatea fechas locales sin convertirlas', () => {
    expect(formatLongDate('2026-10-02')).toContain('2 de octubre de 2026');
    expect(timeOf('2026-10-02T08:30:00')).toBe('08:30');
    expect(hhmm('14:00:00')).toBe('14:00');
  });

  it('genera y valida horas en :00/:30', () => {
    const options = halfHourOptions(7, 9);
    expect(options).toEqual(['07:00', '07:30', '08:00', '08:30', '09:00']);
    expect(isHalfHourAligned('08:30')).toBe(true);
    expect(isHalfHourAligned('08:15')).toBe(false);
  });
});
