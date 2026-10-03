import { LoginResponse, TokenResponse } from '../core/api/api.types';

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
