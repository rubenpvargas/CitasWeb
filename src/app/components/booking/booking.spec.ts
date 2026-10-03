import { TEST_API_URL, slotFixture } from '../../testing/fixtures';
import { setupBooking } from '../../testing/booking-harness';

const AV = `${TEST_API_URL}/api/v1/availability`;

describe('BookingComponent — disponibilidad (HU-015)', () => {
  let ctx: Awaited<ReturnType<typeof setupBooking>>;

  beforeEach(async () => {
    ctx = await setupBooking();
  });

  afterEach(() => ctx.http.verify());

  function setDate(id: string, value: string) {
    const input = ctx.q(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('change'));
  }

  it('lista especialidades reales y sedes activas; sin datos simulados', () => {
    expect(ctx.el.textContent).toContain('Medicina General');
    expect(ctx.el.textContent).toContain('Cardiología');
    expect(ctx.el.textContent).toContain('Requiere aprobación');
    expect(ctx.q('[data-testid="location-HIC"]')).not.toBeNull();
    expect(ctx.q('[data-testid="location-OLD"]')).toBeNull();
    expect(ctx.el.textContent).not.toContain('Teleconsulta');
    expect(ctx.el.textContent).not.toContain('Valentina Herrera');
  });

  it('la búsqueda exige especialidad', () => {
    expect((ctx.q('[data-testid="availability-search"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('busca con specialtyId/from/to (+locationCode) y muestra carga', async () => {
    await ctx.click('specialty-1');
    await ctx.click('location-HIC');
    setDate('av-from', '2099-01-10');
    setDate('av-to', '2099-01-20');
    await ctx.search();
    expect(ctx.q('[data-testid="availability-loading"]')).not.toBeNull();
    expect((ctx.q('[data-testid="availability-search"]') as HTMLButtonElement).disabled).toBe(true);
    const req = ctx.http.expectOne((r) => r.url === AV);
    expect(req.request.params.get('specialtyId')).toBe('1');
    expect(req.request.params.get('from')).toBe('2099-01-10');
    expect(req.request.params.get('to')).toBe('2099-01-20');
    expect(req.request.params.get('locationCode')).toBe('HIC');
    req.flush([]);
  });

  it('resultado vacío muestra el estado vacío', async () => {
    await ctx.click('specialty-1');
    await ctx.search();
    ctx.http.expectOne((r) => r.url === AV).flush([]);
    await ctx.fixture.whenStable();
    expect(ctx.q('[data-testid="availability-empty"]')?.closest('[role="status"]')).not.toBeNull();
    expect(ctx.q('[data-testid="booking-summary"]')).toBeNull();
  });

  it('renderiza solo las franjas devueltas, agrupadas por día, con filtro de profesional', async () => {
    await ctx.click('specialty-1');
    await ctx.search();
    ctx.http.expectOne((r) => r.url === AV).flush([
      slotFixture(),
      slotFixture({ startAt: '2099-01-15T09:00:00', endAt: '2099-01-15T09:30:00', professionalId: 10, professionalName: 'Dr. Sintético Dos' }),
      slotFixture({ startAt: '2099-01-16T10:00:00', endAt: '2099-01-16T10:30:00' }),
    ]);
    await ctx.fixture.whenStable();
    expect(ctx.q('[data-testid="day-2099-01-15"]')).not.toBeNull();
    expect(ctx.q('[data-testid="day-2099-01-16"]')).not.toBeNull();
    expect(ctx.el.querySelectorAll('[data-testid^="slot-"]').length).toBe(2);

    await ctx.click('professional-10');
    expect(ctx.el.querySelectorAll('[data-testid^="slot-"]').length).toBe(1);
    expect(ctx.q('[data-testid="day-2099-01-16"]')).toBeNull();

    await ctx.click('day-2099-01-15');
    await ctx.click('slot-10|HIC|2099-01-15T09:00:00');
    const summary = ctx.q('[data-testid="booking-summary"]');
    expect(summary?.textContent).toContain('Dr. Sintético Dos');
    expect(summary?.textContent).toContain('09:00');
    expect(summary?.textContent).toContain('Cita general');
  });

  it('rechaza rangos inválidos sin llamar a la API', async () => {
    await ctx.click('specialty-2');
    setDate('av-from', '2099-01-01');
    setDate('av-to', '2099-03-01');
    await ctx.search();
    ctx.http.expectNone((r) => r.url === AV);
    expect(ctx.q('[data-testid="availability-error"]')?.textContent).toContain('31 días');
  });

  it('error de red al buscar se muestra en role="alert"', async () => {
    await ctx.click('specialty-1');
    await ctx.search();
    ctx.http.expectOne((r) => r.url === AV).error(new ProgressEvent('error'));
    await ctx.fixture.whenStable();
    const err = ctx.q('[data-testid="availability-error"]');
    expect(err?.closest('[role="alert"]')).not.toBeNull();
    expect(err?.textContent).toContain('conectar con el servidor');
  });

  it('cambiar de especialidad limpia resultados y selección', async () => {
    await ctx.click('specialty-1');
    await ctx.search();
    ctx.http.expectOne((r) => r.url === AV).flush([slotFixture()]);
    await ctx.fixture.whenStable();
    await ctx.click('slot-9|HIC|2099-01-15T08:00:00');
    await ctx.click('specialty-2');
    expect(ctx.el.querySelectorAll('[data-testid^="slot-"]').length).toBe(0);
    expect(ctx.q('[data-testid="booking-summary"]')).toBeNull();
  });

  it('confirma con POST /appointments/general sin profesional fijo (no 9001)', async () => {
    await ctx.click('specialty-1');
    await ctx.search();
    ctx.http.expectOne((r) => r.url === AV).flush([slotFixture()]);
    await ctx.fixture.whenStable();
    await ctx.click('slot-9|HIC|2099-01-15T08:00:00');
    await ctx.click('booking-confirm');
    const req = ctx.http.expectOne({ method: 'POST', url: `${TEST_API_URL}/api/v1/appointments/general` });
    expect(req.request.body).toEqual({ professionalId: 9, locationCode: 'HIC', startAt: '2099-01-15T08:00:00' });
    req.flush({ id: 1, status: 'APPROVED' }, { status: 201, statusText: 'Created' });
    ctx.http.match((r) => r.url === `${TEST_API_URL}/api/v1/appointments`).forEach((r) => r.flush([]));
  });
});
