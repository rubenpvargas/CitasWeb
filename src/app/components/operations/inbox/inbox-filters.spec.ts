import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { InboxComponent } from './inbox';
import { AppConfigService } from '../../../core/config/app-config.service';
import { TEST_API_URL, catalogsFixture } from '../../../testing/fixtures';

const A = `${TEST_API_URL}/api/v1/admin`;
const CONTRACT_BODY = {
  appointments: [{ id: 7, status: 'REQUESTED', startAt: '2099-01-20T10:00:00', specialtyName: 'Cardiología', locationCode: 'HIC', professionalName: 'Dra. Sintética', patientName: 'Paciente S.' }],
  reschedules: [{
    id: 70, appointmentId: 2, status: 'PENDING', specialtyName: 'Cardiología', locationCode: 'ICV', locationName: 'Instituto Cardiovascular',
    currentStartAt: '2099-02-02T08:00:00', currentEndAt: '2099-02-02T08:30:00', requestedStartAt: '2099-02-05T10:00:00', requestedEndAt: '2099-02-05T10:30:00',
  }],
};

describe('InboxComponent — filtros y forma del contrato (HU-025)', () => {
  let fixture: ComponentFixture<InboxComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [InboxComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InboxComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne((r) => r.url === `${A}/inbox`).flush(CONTRACT_BODY);
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush(catalogsFixture());
    http.expectOne(`${A}/specialties`).flush([{ id: 2, code: 'CARD', name: 'Cardiología', durationMinutes: 60, general: false, active: true }]);
    http.expectOne(`${A}/professionals`).flush([{ id: 9, userId: 1, firstName: 'Dra.', lastName: 'Sintética', email: 'x@example.test', professionalCode: 'P', licenseNumber: 'R', active: true }]);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  function set(id: string, value: string) {
    const input = q(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    input.value = value;
    input.dispatchEvent(new Event('change'));
  }
  const apply = async () => {
    (q('[data-testid="inbox-filters"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  it('muestra citas y reprogramaciones de {appointments, reschedules}', () => {
    expect(q('[data-testid="inbox-APPOINTMENT-7"]')?.textContent).toContain('Paciente: Paciente S.');
    expect(q('[data-testid="inbox-APPOINTMENT-7"]')?.textContent).toContain('Dra. Sintética');
    expect(q('[data-testid="inbox-RESCHEDULE-70"]')).not.toBeNull();
  });

  it('reprogramación: muestra horario actual frente al solicitado', () => {
    const slots = q('[data-testid="slots-RESCHEDULE-70"]')?.textContent ?? '';
    expect(slots).toContain('Horario actual');
    expect(slots).toContain('08:00');
    expect(slots).toContain('Nueva franja solicitada');
    expect(slots).toContain('10:00');
  });

  it('envía los filtros como parámetros de GET /admin/inbox', async () => {
    set('in-location', 'HIC');
    set('in-specialty', '2');
    set('in-professional', '9');
    set('in-from', '2099-01-01');
    set('in-to', '2099-01-31');
    await apply();
    const req = http.expectOne((r) => r.url === `${A}/inbox`);
    expect(req.request.params.get('locationCode')).toBe('HIC');
    expect(req.request.params.get('specialtyId')).toBe('2');
    expect(req.request.params.get('professionalId')).toBe('9');
    expect(req.request.params.get('from')).toBe('2099-01-01');
    expect(req.request.params.get('to')).toBe('2099-01-31');
    req.flush({ appointments: [], reschedules: [] });
    await fixture.whenStable();
    expect(q('[data-testid="inbox-empty"]')).not.toBeNull();
  });

  it('los filtros se conservan al refrescar tras una decisión', async () => {
    set('in-location', 'ICV');
    await apply();
    http.expectOne((r) => r.url === `${A}/inbox`).flush(CONTRACT_BODY);
    await fixture.whenStable();
    (q('[data-testid="approve-APPOINTMENT-7"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    (q('[data-testid="decision-APPOINTMENT-7"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectOne({ method: 'POST', url: `${A}/appointments/7/decision` }).flush(null);
    const reload = http.expectOne((r) => r.url === `${A}/inbox`);
    expect(reload.request.params.get('locationCode')).toBe('ICV');
    reload.flush({ appointments: [], reschedules: [] });
  });

  it('valida el rango de fechas', async () => {
    set('in-from', '2099-01-01');
    await apply();
    http.expectNone((r) => r.url === `${A}/inbox`);
    expect(q('[data-testid="inbox-error"]')?.textContent).toContain('ambas fechas');
  });
});
