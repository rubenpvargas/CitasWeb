import { expect, test } from '@playwright/test';
import { bookedAppointmentId, loginAs, searchAndPickFirstSlot } from './support/helpers';

/** (d) HU-015/016/019/020: el USER reserva cita general, la ve en Mis citas y la cancela. */
test('reserva general → mis citas → cancelar', async ({ page }) => {
  await loginAs(page, 'patient');
  await searchAndPickFirstSlot(page, /Medicina General/);
  await page.getByTestId('booking-confirm').click();

  const id = await bookedAppointmentId(page);
  await expect(page.getByTestId('booking-success')).toContainText('¡Cita agendada con éxito!');
  await expect(page.getByTestId('booking-success-status')).toHaveText('Confirmada');

  await page.goto('/mis-citas');
  await expect(page.getByTestId(`status-${id}`)).toHaveText('Confirmada');

  await page.getByTestId(`cancel-${id}`).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByTestId('cancel-confirm').click();
  await expect(page.getByTestId('appointments-message')).toContainText(`Cita N.º ${id} cancelada`);
  await expect(page.getByTestId(`status-${id}`)).toHaveText('Cancelada');
});
