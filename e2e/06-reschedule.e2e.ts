import { expect, test } from '@playwright/test';
import { bookedAppointmentId, loginAs, logout, searchAndPickFirstSlot } from './support/helpers';

/** (f) HU-021/022: el USER solicita reprogramación y el ADMIN la aprueba. */
test('reprogramación solicitada y aprobada', async ({ page }) => {
  await loginAs(page, 'patient');
  await searchAndPickFirstSlot(page, /Medicina General/);
  await page.getByTestId('booking-confirm').click();
  const id = await bookedAppointmentId(page);

  await page.goto('/mis-citas');
  await page.getByTestId(`reschedule-${id}`).click();
  const dialog = page.getByTestId('reschedule-dialog');
  await expect(dialog).toBeVisible();
  const newSlot = dialog.locator('[data-testid^="rs-slot-"]').first();
  await expect(newSlot, 'se requiere otra franja libre del mismo profesional').toBeVisible();
  await newSlot.click();
  await page.getByTestId('reschedule-submit').click();
  await expect(page.getByTestId('appointments-message')).toContainText('Solicitud de reprogramación enviada');
  await expect(page.getByTestId(`pending-reschedule-${id}`)).toBeVisible();
  await logout(page);

  await loginAs(page, 'admin');
  await page.goto('/operacion/bandeja');
  const item = page.locator('[data-testid^="inbox-RESCHEDULE-"]').first();
  await expect(item).toBeVisible();
  const key = ((await item.getAttribute('data-testid')) ?? '').replace('inbox-', '');
  await page.getByTestId(`approve-${key}`).click();
  await page.getByTestId('decision-confirm').click();
  await expect(page.getByTestId(`decided-${key}`)).toContainText('Reprogramación aprobada');
  await logout(page);

  await loginAs(page, 'patient');
  await page.goto('/mis-citas');
  await expect(page.getByTestId(`status-${id}`)).toHaveText('Confirmada');
});
