import { expect, test } from '@playwright/test';
import { loginAs } from './support/helpers';

/** (g) HU-023: la agenda del PROFESSIONAL muestra las citas aprobadas (p. ej. la del escenario f). */
test('la agenda semanal muestra citas aprobadas con solo el nombre del paciente', async ({ page }) => {
  await loginAs(page, 'professional');
  await page.goto('/operacion/agenda');
  await page.getByTestId('preset-week').click();
  const items = page.locator('[data-testid^="agenda-"]').filter({ hasText: 'Confirmada' });
  await expect(items.first()).toBeVisible();
  await expect(items.first()).toContainText('Ana Martinez');
  await expect(page.locator('main')).not.toContainText('@demo.invalid');
});
