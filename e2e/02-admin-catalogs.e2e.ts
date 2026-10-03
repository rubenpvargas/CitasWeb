import { expect, test } from '@playwright/test';
import { loginAs, uniqueSuffix } from './support/helpers';

/** (b) HU-008/009: el ADMIN crea una especialidad y una EPS. */
test.describe('ADMIN catálogos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/operacion\/bandeja/);
  });

  test('crea una especialidad especializada de 30 minutos', async ({ page }) => {
    const code = `E2E_${uniqueSuffix()}`;
    await page.goto('/operacion/especialidades');
    await page.locator('#spec-code').fill(code);
    await page.locator('#spec-name').fill(`Especialidad ${code}`);
    await page.locator('#spec-duration').selectOption({ label: '30 minutos' });
    await page.getByTestId('spec-create').click();
    await expect(page.getByRole('list', { name: 'Especialidades registradas' })).toContainText(`Especialidad ${code}`);
  });

  test('crea una EPS', async ({ page }) => {
    const code = `EPS_E2E_${uniqueSuffix()}`;
    await page.goto('/operacion/eps');
    await page.locator('#eps-code').fill(code);
    await page.locator('#eps-name').fill(`EPS Sintética ${code}`);
    await page.getByTestId('eps-create').click();
    await expect(page.getByRole('list', { name: 'EPS registradas' })).toContainText(`EPS Sintética ${code}`);
  });
});
