import { expect, test } from '@playwright/test';
import { bookedAppointmentId, loginAs, logout, searchAndPickFirstSlot, uniqueSuffix } from './support/helpers';

/** (e) HU-017/018/019: solicitud especializada → ADMIN rechaza con motivo → USER ve el motivo. */
test('especializada pendiente, rechazo con motivo y motivo visible para el paciente', async ({ page }) => {
  const reason = `Orden médica sintética vencida ${uniqueSuffix()}`;

  await loginAs(page, 'patient');
  await searchAndPickFirstSlot(page, /Cardiolog/);
  await page.getByTestId('booking-confirm').click();
  const id = await bookedAppointmentId(page);
  await expect(page.getByTestId('booking-success')).toContainText('Solicitud pendiente de aprobación');
  await expect(page.getByTestId('booking-success')).not.toContainText('agendada con éxito');
  await logout(page);

  await loginAs(page, 'admin');
  await page.goto('/operacion/bandeja');
  await page.getByTestId(`reject-APPOINTMENT-${id}`).click();
  await page.getByTestId('reject-reason').fill(reason);
  await page.getByTestId('decision-confirm').click();
  await expect(page.getByTestId('inbox-message')).toContainText(`Rechazada la solicitud #${id}`);
  await logout(page);

  await loginAs(page, 'patient');
  await page.goto('/mis-citas');
  await expect(page.getByTestId(`status-${id}`)).toHaveText('Rechazada');
  await expect(page.getByTestId(`rejection-${id}`)).toContainText(reason);
});
