import { expect, test } from '@playwright/test';
import { login, logout, uniqueSuffix } from './support/helpers';

/** (a) HU-001/002/003: registro → login → inicio → logout, con datos sintéticos. */
test('registro, inicio de sesión, inicio y cierre de sesión', async ({ page }) => {
  const suffix = uniqueSuffix();
  const email = `e2e.${suffix.toLowerCase()}@example.test`;
  // Contraseña sintética generada en cada ejecución (cumple la política: mayúscula y dígito).
  const password = `E2e${suffix}9x`;

  await page.goto('/registro');
  await page.locator('#first-name').fill('Paciente');
  await page.locator('#last-name').fill(`E2E ${suffix}`);
  await page.locator('#doc-number').fill(`77${Date.now().toString().slice(-8)}`);
  await page.locator('#email').fill(email);
  await page.locator('#phone').fill('3000000000');
  await page.locator('#password').fill(password);
  await page.locator('#confirm-password').fill(password);
  await page.locator('#terms').check();
  await page.getByTestId('register-submit').click();

  await expect(page).toHaveURL(/\/login\?aviso=registro-exitoso/);
  await expect(page.getByTestId('login-notice')).toContainText('Cuenta creada');

  await login(page, email, password);
  await expect(page).toHaveURL(/\/inicio/);
  await expect(page.getByText('Hola, Paciente')).toBeVisible();

  await logout(page);
  await page.goto('/inicio');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Finicio/);
});

test('credenciales inválidas muestran el mensaje genérico', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('nadie@example.test');
  await page.locator('#password').fill('NoExiste123');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-error')).toContainText('Credenciales no reconocidas');
});
