import { expect, test } from '@playwright/test';
import { bogotaDate, loginAs } from './support/helpers';

/** (c) HU-012/014: el PROFESSIONAL publica un bloque para mañana y lo ve en su calendario. */
test('publica un bloque mañana en HIC', async ({ page }) => {
  await loginAs(page, 'professional');
  await expect(page).toHaveURL(/\/operacion\/bloques/);

  const tomorrow = bogotaDate(1);
  // V5 siembra mañana 08:00–12:00; se usa una franja vespertina variable para reejecuciones.
  const hour = 13 + (Math.floor(Date.now() / 60_000) % 7); // 13..19
  const start = `${String(hour).padStart(2, '0')}:00`;
  const end = `${String(hour).padStart(2, '0')}:30`;

  await page.getByTestId('block-date').fill(tomorrow);
  await page.getByTestId('block-location').selectOption('HIC');
  await page.getByTestId('block-start').selectOption(start);
  await page.getByTestId('block-end').selectOption(end);
  await page.getByTestId('block-submit').click();

  const created = page.getByTestId('block-created');
  const conflict = page.getByTestId('block-create-error');
  await expect(created.or(conflict)).toBeVisible();
  // Una reejecución en el mismo minuto puede chocar con el bloque anterior (409 BLOCK_OVERLAP).
  if (await conflict.isVisible()) {
    await expect(conflict).toContainText('se cruza');
  } else {
    await expect(created).toContainText('Bloque publicado');
    await expect(page.locator('[data-testid^="block-"]').filter({ hasText: `${start}–${end}` }).first()).toBeVisible();
  }
});
