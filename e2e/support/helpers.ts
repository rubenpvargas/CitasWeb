import { Page, expect, test } from '@playwright/test';

/** Usuarios sintéticos sembrados por Flyway V5 (dominio reservado .invalid). */
export const DEMO_USERS = {
  admin: 'admin@demo.invalid',
  professional: 'profesional@demo.invalid',
  patient: 'paciente@demo.invalid',
} as const;

export type DemoRole = keyof typeof DEMO_USERS;

/** Contraseña demo leída del entorno; nunca se escribe en el repositorio. */
export function demoPassword(): string {
  const value = process.env['E2E_DEMO_PASSWORD'];
  test.skip(!value, 'Define E2E_DEMO_PASSWORD con la contraseña de los usuarios demo de V5.');
  return value as string;
}

/** Sufijo único por ejecución para datos sintéticos creados por las pruebas. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`.toUpperCase();
}

/** Fecha local de Bogotá `YYYY-MM-DD` desplazada `days` días. */
export function bogotaDate(days = 0): string {
  const now = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  await login(page, DEMO_USERS[role], demoPassword());
}

export async function logout(page: Page): Promise<void> {
  await page.goto('/perfil');
  await page.getByTestId('logout-button').click();
  await expect(page).toHaveURL(/\/login/);
}

/** Id de cita a partir del diálogo de éxito de la reserva ("N.º 123"). */
export async function bookedAppointmentId(page: Page): Promise<string> {
  const dialog = page.getByTestId('booking-success');
  await expect(dialog).toBeVisible();
  const text = (await dialog.textContent()) ?? '';
  const match = /N\.º\s*(\d+)/.exec(text);
  expect(match, 'el diálogo debe mostrar el número de la cita').not.toBeNull();
  return (match as RegExpExecArray)[1];
}

/** Busca disponibilidad para una especialidad (por nombre) en HIC y elige la primera franja. */
export async function searchAndPickFirstSlot(page: Page, specialtyName: RegExp): Promise<void> {
  await page.goto('/reservar');
  await page.getByRole('button', { name: specialtyName }).first().click();
  await page.getByTestId('location-HIC').click();
  await page.getByTestId('availability-search').click();
  const firstSlot = page.locator('[data-testid^="slot-"]').first();
  await expect(firstSlot, 'se requieren franjas libres sembradas (V5) o publicadas').toBeVisible();
  await firstSlot.click();
  await expect(page.getByTestId('booking-summary')).toBeVisible();
}
