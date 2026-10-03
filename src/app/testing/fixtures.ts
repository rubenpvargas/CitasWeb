import { LoginResponse, TokenResponse } from '../core/api/api.types';
import { CalendarBlockDto } from '../core/api/professional.api';

/** Fixtures sintéticos para pruebas. No contienen datos reales. */
export const TEST_API_URL = 'http://api.test';

const HOUR = 60 * 60 * 1000;

export function tokenResponse(suffix = '1', now = Date.now()): TokenResponse {
  return {
    accessToken: `access-${suffix}`,
    refreshToken: `refresh-${suffix}`,
    tokenType: 'Bearer',
    accessExpiresAt: new Date(now + HOUR / 4).toISOString(),
    refreshExpiresAt: new Date(now + 24 * HOUR).toISOString(),
  };
}

export function loginResponse(roles: string[] = ['USER'], suffix = '1'): LoginResponse {
  return {
    ...tokenResponse(suffix),
    user: { id: 7, firstName: 'Paciente', lastName: 'Sintético', email: 'paciente@example.test', roles },
  };
}

/** `GET /api/v1/catalogs` sintético (sin `id` en regímenes, como el contrato actual). */
export function catalogsFixture() {
  return {
    roles: [],
    appointmentStatuses: [],
    rescheduleRequestStatuses: [],
    insuranceRegimes: [
      { code: 'CONTRIBUTIVO', name: 'Contributivo' },
      { code: 'SUBSIDIADO', name: 'Subsidiado' },
    ],
    locations: [
      { code: 'HIC', name: 'Hospital Internacional de Colombia', address: 'Sintética 1', city: 'Piedecuesta', department: 'Santander', active: true },
      { code: 'ICV', name: 'Instituto Cardiovascular', address: 'Sintética 2', city: 'Floridablanca', department: 'Santander', active: true },
      { code: 'OLD', name: 'Sede inactiva', address: 'x', city: 'x', department: 'x', active: false },
    ],
  };
}

/** Bloques sintéticos del calendario profesional (HU-013/014). */
export const BLOCKS: CalendarBlockDto[] = [
  { id: 2, date: '2099-01-16', startTime: '14:00', endTime: '16:00', locationCode: 'ICV', locationName: 'Instituto Cardiovascular', totalSlots: 4, committedSlots: 1, editable: false },
  { id: 1, date: '2099-01-15', startTime: '08:00', endTime: '10:00', locationCode: 'HIC', locationName: 'Hospital Internacional', totalSlots: 4, committedSlots: 0, editable: true },
  { id: 3, date: '2020-01-10', startTime: '08:00', endTime: '09:00', locationCode: 'HIC', locationName: 'Hospital Internacional', totalSlots: 2, committedSlots: 0, editable: false },
];
