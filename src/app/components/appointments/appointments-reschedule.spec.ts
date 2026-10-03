import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppointmentsComponent } from './appointments';
import { AppConfigService } from '../../core/config/app-config.service';
import { MIXED, TEST_API_URL, catalogsFixture, slotFixture } from '../../testing/fixtures';

const URL = `${TEST_API_URL}/api/v1/appointments`;
const AV = `${TEST_API_URL}/api/v1/availability`;
const NEW_SLOT = slotFixture({ startAt: '2099-02-04T10:00:00', endAt: '2099-02-04T10:30:00', locationCode: 'ICV', locationName: 'Instituto Cardiovascular' });

describe('AppointmentsComponent — reprogramar (HU-021)', () => {
  let fixture: ComponentFixture<AppointmentsComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AppointmentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AppointmentsComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL).flush(MIXED);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const click = async (testId: string) => {
    (q(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };
  async function open() {
    await click('reschedule-2');
    http.match(`${TEST_API_URL}/api/v1/catalogs`).forEach((r) => r.flush(catalogsFixture()));
    const req = http.expectOne((r) => r.url === AV);
    return req;
  }

  it('solo ofrece reprogramar cuando el backend marca reschedulable', () => {
    expect(q('[data-testid="reschedule-2"]')).not.toBeNull();
    expect(q('[data-testid="reschedule-1"]')).toBeNull();
    expect(q('[data-testid="reschedule-7"]')).toBeNull();
  });

  it('busca disponibilidad del mismo profesional y especialidad', async () => {
    const req = await open();
    expect(req.request.params.get('specialtyId')).toBe('1');
    expect(req.request.params.get('professionalId')).toBe('9');
    req.flush([NEW_SLOT]);
    await fixture.whenStable();
    const dialog = q('[data-testid="reschedule-dialog"]');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.textContent).toContain('Tu cita actual se mantiene');
    expect(q('[data-testid="rs-slot-2099-02-04T10:00:00"]')).not.toBeNull();
    expect((q('[data-testid="reschedule-submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sin cupos muestra el estado vacío', async () => {
    (await open()).flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="reschedule-empty"]')).not.toBeNull();
  });

  it('envía {startAt, locationCode} sin profesional ni especialidad y muestra pendiente', async () => {
    (await open()).flush([NEW_SLOT]);
    await fixture.whenStable();
    await click('rs-slot-2099-02-04T10:00:00');
    await click('reschedule-submit');
    const req = http.expectOne({ method: 'POST', url: `${URL}/2/reschedule` });
    expect(req.request.body).toEqual({ startAt: '2099-02-04T10:00:00', locationCode: 'ICV' });
    req.flush({ id: 80, appointmentId: 2, status: 'PENDING', requestedStartAt: '2099-02-04T10:00:00', requestedEndAt: '2099-02-04T10:30:00', locationCode: 'ICV' }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL).flush(MIXED);
    await fixture.whenStable();
    expect(q('[data-testid="reschedule-dialog"]')).toBeNull();
    expect(q('[data-testid="appointments-message"]')?.textContent).toContain('Tu cita actual se mantiene hasta la decisión');
  });

  it('409 RESCHEDULE_ALREADY_PENDING se muestra en el diálogo', async () => {
    (await open()).flush([NEW_SLOT]);
    await fixture.whenStable();
    await click('rs-slot-2099-02-04T10:00:00');
    await click('reschedule-submit');
    http.expectOne({ method: 'POST', url: `${URL}/2/reschedule` }).flush({ code: 'RESCHEDULE_ALREADY_PENDING' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="reschedule-error"]')?.textContent).toContain('ya tiene una solicitud de reprogramación pendiente');
  });

  it('409 SLOT_UNAVAILABLE recarga los cupos', async () => {
    (await open()).flush([NEW_SLOT]);
    await fixture.whenStable();
    await click('rs-slot-2099-02-04T10:00:00');
    await click('reschedule-submit');
    http.expectOne({ method: 'POST', url: `${URL}/2/reschedule` }).flush({ code: 'SLOT_UNAVAILABLE' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    http.expectOne((r) => r.url === AV).flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="reschedule-error"]')?.textContent).toContain('ya no está disponible');
    expect(q('[data-testid="reschedule-empty"]')).not.toBeNull();
  });
});
