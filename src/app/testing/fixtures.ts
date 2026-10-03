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

/** `GET /api/v1/specialties` sintético. */
export const ACTIVE_SPECIALTIES = [
  { id: 1, code: 'GEN', name: 'Medicina General', durationMinutes: 30, general: true },
  { id: 2, code: 'CARD', name: 'Cardiología', durationMinutes: 60, general: false },
];

/** `GET /api/v1/availability` sintético (franjas devueltas por el backend). */
export function slotFixture(overrides: Partial<{ professionalId: number; professionalName: string; specialtyId: number; specialtyName: string; locationCode: string; locationName: string; startAt: string; endAt: string; durationMinutes: number }> = {}) {
  return {
    professionalId: 9,
    professionalName: 'Dra. Sintética Uno',
    specialtyId: 1,
    specialtyName: 'Medicina General',
    locationCode: 'HIC',
    locationName: 'Hospital Internacional de Colombia',
    startAt: '2099-01-15T08:00:00',
    endAt: '2099-01-15T08:30:00',
    durationMinutes: 30,
    ...overrides,
  };
}

/** `AppointmentDto` sintético (Ola E). */
export function appointmentFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    status: 'APPROVED',
    locationCode: 'HIC',
    locationName: 'Hospital Internacional de Colombia',
    professionalId: 9,
    professionalName: 'Dra. Sintética Uno',
    specialtyId: 1,
    specialtyName: 'Medicina General',
    startAt: '2099-01-15T08:00:00',
    endAt: '2099-01-15T08:30:00',
    durationMinutes: 30,
    reason: null,
    rejectionReason: null,
    pendingReschedule: null,
    cancellable: true,
    reschedulable: true,
    ...overrides,
  };
}

/** Citas sintéticas en todos los estados (HU-019 a HU-021). */
export const MIXED = [
  appointmentFixture({ id: 1, status: 'REQUESTED', startAt: '2099-02-01T08:00:00', endAt: '2099-02-01T09:00:00', cancellable: true, reschedulable: false }),
  appointmentFixture({ id: 2, status: 'APPROVED', startAt: '2099-02-02T08:00:00', endAt: '2099-02-02T08:30:00' }),
  appointmentFixture({ id: 3, status: 'REJECTED', rejectionReason: 'Orden médica vencida', cancellable: false, reschedulable: false }),
  appointmentFixture({ id: 4, status: 'CANCELLED', cancellable: false, reschedulable: false }),
  appointmentFixture({ id: 5, status: 'COMPLETED', startAt: '2020-01-01T08:00:00', endAt: '2020-01-01T08:30:00', cancellable: false, reschedulable: false }),
  appointmentFixture({ id: 6, status: 'NO_SHOW', startAt: '2020-01-02T08:00:00', endAt: '2020-01-02T08:30:00', cancellable: false, reschedulable: false }),
  appointmentFixture({
    id: 7, status: 'APPROVED', startAt: '2099-03-01T08:00:00', endAt: '2099-03-01T08:30:00', reschedulable: false,
    pendingReschedule: { id: 70, requestedStartAt: '2099-03-05T10:00:00', requestedEndAt: '2099-03-05T10:30:00', locationCode: 'ICV' },
  }),
];

/** Agenda profesional sintética (HU-023/024): solo nombre del paciente. */
export const AGENDA = [
  { id: 1, startAt: '2026-10-01T08:00:00', endAt: '2026-10-01T08:30:00', locationCode: 'HIC', specialtyName: 'Medicina General', patientName: 'Paciente Sintético Uno', closable: true },
  { id: 2, startAt: '2099-10-02T09:00:00', endAt: '2099-10-02T09:30:00', locationCode: 'ICV', specialtyName: 'Medicina General', patientName: 'Paciente Sintético Dos', closable: false },
];
