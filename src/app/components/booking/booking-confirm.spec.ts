import { TEST_API_URL, appointmentFixture, slotFixture } from '../../testing/fixtures';
import { setupBooking } from '../../testing/booking-harness';
import { SLOT_TAKEN_MESSAGE } from './booking';

const AV = `${TEST_API_URL}/api/v1/availability`;
const GENERAL = `${TEST_API_URL}/api/v1/appointments/general`;
const APPTS = `${TEST_API_URL}/api/v1/appointments`;

const SLOT_A = slotFixture();
const SLOT_B = slotFixture({ startAt: '2099-01-15T09:00:00', endAt: '2099-01-15T09:30:00' });

describe('BookingComponent — confirmación general (HU-016)', () => {
  let ctx: Awaited<ReturnType<typeof setupBooking>>;

  beforeEach(async () => {
    ctx = await setupBooking();
    await ctx.click('specialty-1');
    await ctx.search();
    ctx.http.expectOne((r) => r.url === AV).flush([SLOT_A, SLOT_B]);
    await ctx.fixture.whenStable();
    await ctx.click('slot-9|HIC|2099-01-15T08:00:00');
  });

  afterEach(() => {
    ctx.http.match((r) => r.url === APPTS).forEach((r) => r.flush([]));
    ctx.http.verify();
  });

  const confirmButton = () => ctx.q('[data-testid="booking-confirm"]') as HTMLButtonElement;

  it('muestra el resumen antes de confirmar', () => {
    const summary = ctx.q('[data-testid="booking-summary"]')?.textContent ?? '';
    expect(summary).toContain('Medicina General');
    expect(summary).toContain('Dra. Sintética Uno');
    expect(summary).toContain('Hospital Internacional de Colombia');
    expect(summary).toContain('08:00');
    expect(confirmButton().textContent).toContain('Confirmar y agendar cita');
  });

  it('201: muestra los datos devueltos por la API y el estado Confirmada', async () => {
    const reason = ctx.q('[data-testid="booking-reason"]') as HTMLTextAreaElement;
    reason.value = '  Control anual  ';
    reason.dispatchEvent(new Event('input'));
    await ctx.click('booking-confirm');
    const req = ctx.http.expectOne({ method: 'POST', url: GENERAL });
    expect(req.request.body).toEqual({ professionalId: 9, locationCode: 'HIC', startAt: '2099-01-15T08:00:00', reason: 'Control anual' });
    req.flush(appointmentFixture({ id: 555 }), { status: 201, statusText: 'Created' });
    await ctx.fixture.whenStable();
    const dialog = ctx.q('[data-testid="booking-success"]');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.textContent).toContain('¡Cita agendada con éxito!');
    expect(dialog?.textContent).toContain('N.º 555');
    expect(ctx.q('[data-testid="booking-success-status"]')?.textContent).toBe('Confirmada');
  });

  it('sin motivo no envía el campo reason', async () => {
    await ctx.click('booking-confirm');
    const req = ctx.http.expectOne({ method: 'POST', url: GENERAL });
    expect('reason' in req.request.body).toBe(false);
    req.flush(appointmentFixture(), { status: 201, statusText: 'Created' });
  });

  it('evita doble envío mientras confirma', async () => {
    await ctx.click('booking-confirm');
    expect(confirmButton().disabled).toBe(true);
    expect(confirmButton().textContent).toContain('Confirmando cita médica');
    confirmButton().click();
    confirmButton().dispatchEvent(new Event('click'));
    await ctx.fixture.whenStable();
    const reqs = ctx.http.match({ method: 'POST', url: GENERAL });
    expect(reqs.length).toBe(1);
    reqs[0].flush(appointmentFixture(), { status: 201, statusText: 'Created' });
  });

  it('409 SLOT_UNAVAILABLE: mensaje accesible y recarga automática de disponibilidad', async () => {
    await ctx.click('booking-confirm');
    ctx.http.expectOne({ method: 'POST', url: GENERAL }).flush({ code: 'SLOT_UNAVAILABLE' }, { status: 409, statusText: 'Conflict' });
    await ctx.fixture.whenStable();
    const reload = ctx.http.expectOne((r) => r.url === AV);
    expect(reload.request.params.get('specialtyId')).toBe('1');
    reload.flush([SLOT_B]);
    await ctx.fixture.whenStable();
    const taken = ctx.q('[data-testid="slot-taken"]');
    expect(taken?.closest('[role="alert"]')).not.toBeNull();
    expect(taken?.textContent).toBe(SLOT_TAKEN_MESSAGE);
    expect(ctx.q('[data-testid="slot-9|HIC|2099-01-15T08:00:00"]')).toBeNull();
    expect(ctx.q('[data-testid="slot-9|HIC|2099-01-15T09:00:00"]')).not.toBeNull();
    expect(ctx.q('[data-testid="booking-summary"]')).toBeNull();
    expect(ctx.q('[data-testid="booking-success"]')).toBeNull();
  });

  it('elegir otro horario tras el 409 retira el aviso', async () => {
    await ctx.click('booking-confirm');
    ctx.http.expectOne({ method: 'POST', url: GENERAL }).flush({ code: 'SLOT_UNAVAILABLE' }, { status: 409, statusText: 'Conflict' });
    await ctx.fixture.whenStable();
    ctx.http.expectOne((r) => r.url === AV).flush([SLOT_B]);
    await ctx.fixture.whenStable();
    await ctx.click('slot-9|HIC|2099-01-15T09:00:00');
    expect(ctx.q('[data-testid="slot-taken"]')).toBeNull();
  });

  it('403 (otro rol) muestra no autorizado en la alerta', async () => {
    await ctx.click('booking-confirm');
    ctx.http.expectOne({ method: 'POST', url: GENERAL }).flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });
    await ctx.fixture.whenStable();
    expect(ctx.q('[data-testid="booking-error"]')?.textContent).toContain('No tienes permisos');
    expect(confirmButton().disabled).toBe(false);
  });

  it('400 VALIDATION_ERROR se muestra sin recargar', async () => {
    await ctx.click('booking-confirm');
    ctx.http.expectOne({ method: 'POST', url: GENERAL }).flush({ code: 'VALIDATION_ERROR' }, { status: 400, statusText: 'Bad Request' });
    await ctx.fixture.whenStable();
    ctx.http.expectNone((r) => r.url === AV);
    expect(ctx.q('[data-testid="booking-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });

  it('error de red al confirmar se muestra y permite reintentar', async () => {
    await ctx.click('booking-confirm');
    ctx.http.expectOne({ method: 'POST', url: GENERAL }).error(new ProgressEvent('error'));
    await ctx.fixture.whenStable();
    expect(ctx.q('[data-testid="booking-error"]')?.textContent).toContain('conectar con el servidor');
    await ctx.click('booking-confirm');
    ctx.http.expectOne({ method: 'POST', url: GENERAL }).flush(appointmentFixture(), { status: 201, statusText: 'Created' });
  });
});
