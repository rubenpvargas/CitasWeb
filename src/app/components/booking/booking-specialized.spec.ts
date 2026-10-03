import { TEST_API_URL, appointmentFixture, slotFixture } from '../../testing/fixtures';
import { setupBooking } from '../../testing/booking-harness';

const AV = `${TEST_API_URL}/api/v1/availability`;
const SPECIALIZED = `${TEST_API_URL}/api/v1/appointments/specialized`;
const APPTS = `${TEST_API_URL}/api/v1/appointments`;
const CARD_SLOT = slotFixture({
  specialtyId: 2, specialtyName: 'Cardiología', startAt: '2099-01-20T10:00:00', endAt: '2099-01-20T11:00:00', durationMinutes: 60,
});

describe('BookingComponent — solicitud especializada (HU-017)', () => {
  let ctx: Awaited<ReturnType<typeof setupBooking>>;

  beforeEach(async () => {
    ctx = await setupBooking();
    await ctx.click('specialty-2');
    await ctx.search();
    const req = ctx.http.expectOne((r) => r.url === AV);
    expect(req.request.params.get('specialtyId')).toBe('2');
    req.flush([CARD_SLOT]);
    await ctx.fixture.whenStable();
    await ctx.click('slot-9|HIC|2099-01-20T10:00:00');
  });

  afterEach(() => {
    ctx.http.match((r) => r.url === APPTS).forEach((r) => r.flush([]));
    ctx.http.verify();
  });

  it('el resumen advierte que requiere aprobación y no promete confirmación', () => {
    const summary = ctx.q('[data-testid="booking-summary"]')?.textContent ?? '';
    expect(summary).toContain('requiere aprobación');
    expect(ctx.q('[data-testid="booking-specialized-note"]')).not.toBeNull();
    expect(ctx.q('[data-testid="booking-confirm"]')?.textContent).toContain('Enviar solicitud de cita');
    expect(summary).not.toContain('Confirmar y agendar');
  });

  it('envía POST /appointments/specialized con specialtyId y muestra "Solicitud pendiente de aprobación"', async () => {
    await ctx.click('booking-confirm');
    expect(ctx.q('[data-testid="booking-confirm"]')?.textContent).toContain('Enviando solicitud');
    const req = ctx.http.expectOne({ method: 'POST', url: SPECIALIZED });
    expect(req.request.body).toEqual({ specialtyId: 2, professionalId: 9, locationCode: 'HIC', startAt: '2099-01-20T10:00:00' });
    req.flush(appointmentFixture({ status: 'REQUESTED', specialtyId: 2, specialtyName: 'Cardiología', startAt: '2099-01-20T10:00:00', endAt: '2099-01-20T11:00:00' }), { status: 201, statusText: 'Created' });
    await ctx.fixture.whenStable();

    const dialog = ctx.q('[data-testid="booking-success"]');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.textContent).toContain('Solicitud pendiente de aprobación');
    expect(dialog?.textContent).toContain('Aún no es una cita confirmada');
    expect(dialog?.textContent).not.toContain('agendada con éxito');
    expect(dialog?.textContent).not.toMatch(/\bConfirmada\b/);
    expect(ctx.q('[data-testid="booking-success-status"]')?.textContent).toBe('Pendiente de aprobación');
  });

  it('409 SLOT_UNAVAILABLE también recarga la disponibilidad especializada', async () => {
    await ctx.click('booking-confirm');
    ctx.http.expectOne({ method: 'POST', url: SPECIALIZED }).flush({ code: 'SLOT_UNAVAILABLE' }, { status: 409, statusText: 'Conflict' });
    await ctx.fixture.whenStable();
    const reload = ctx.http.expectOne((r) => r.url === AV);
    expect(reload.request.params.get('specialtyId')).toBe('2');
    reload.flush([]);
    await ctx.fixture.whenStable();
    expect(ctx.q('[data-testid="slot-taken"]')).not.toBeNull();
    expect(ctx.q('[data-testid="availability-empty"]')).not.toBeNull();
  });
});
