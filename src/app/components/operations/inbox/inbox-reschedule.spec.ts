import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { InboxComponent } from './inbox';
import { AppConfigService } from '../../../core/config/app-config.service';
import { InboxItemDto } from '../../../core/api/admin.api';
import { TEST_API_URL, catalogsFixture } from '../../../testing/fixtures';

const A = `${TEST_API_URL}/api/v1/admin`;
const RESCHEDULE: InboxItemDto = { itemType: 'RESCHEDULE', id: 70, status: 'PENDING', startAt: '2099-03-05T10:00:00', specialtyName: 'Cardiología', locationCode: 'ICV' };
const APPOINTMENT: InboxItemDto = { itemType: 'APPOINTMENT', id: 7, status: 'REQUESTED', startAt: '2099-01-20T10:00:00', specialtyName: 'Cardiología', locationCode: 'HIC' };

/** Catálogos de los filtros de HU-025 (no relevantes aquí). */
function flushFilterCatalogs(http: HttpTestingController) {
  http.match(`${TEST_API_URL}/api/v1/catalogs`).forEach((r) => r.flush(catalogsFixture()));
  http.match((r) => r.url === `${A}/specialties` || r.url === `${A}/professionals`).forEach((r) => r.flush([]));
}

describe('InboxComponent — decisión de reprogramación (HU-022)', () => {
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
    http.expectOne(`${A}/inbox`).flush([APPOINTMENT, RESCHEDULE]);
    await fixture.whenStable();
  });

  afterEach(() => {
    flushFilterCatalogs(http);
    http.verify();
  });

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const click = async (testId: string) => {
    (q(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };
  const submit = async (key: string) => {
    (q(`[data-testid="decision-${key}"]`) as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  it('distingue reprogramaciones pendientes de solicitudes de cita', () => {
    expect(q('[data-testid="state-RESCHEDULE-70"]')?.textContent?.trim()).toBe('Reprogramación pendiente');
    expect(q('[data-testid="state-APPOINTMENT-7"]')?.textContent?.trim()).toBe('Pendiente de aprobación');
    expect(q('[data-testid="inbox-RESCHEDULE-70"]')?.textContent).toContain('Nueva franja solicitada');
  });

  it('aprobar reprogramación usa /admin/reschedules/{id}/decision y queda como aprobada', async () => {
    await click('approve-RESCHEDULE-70');
    expect(q('[data-testid="decision-RESCHEDULE-70"]')?.textContent).toContain('adoptará la nueva franja');
    await submit('RESCHEDULE-70');
    const req = http.expectOne({ method: 'POST', url: `${A}/reschedules/70/decision` });
    expect(req.request.body).toEqual({ approve: true, reason: null });
    req.flush(null);
    http.expectOne(`${A}/inbox`).flush([APPOINTMENT]);
    await fixture.whenStable();
    expect(q('[data-testid="decided-RESCHEDULE-70"]')?.textContent).toContain('Reprogramación aprobada');
    expect(q('[data-testid="decided-RESCHEDULE-70"]')?.textContent).toContain('adopta la nueva franja');
    expect(q('[data-testid="inbox-RESCHEDULE-70"]')).toBeNull();
  });

  it('rechazar reprogramación exige motivo y queda como rechazada', async () => {
    await click('reject-RESCHEDULE-70');
    await submit('RESCHEDULE-70');
    http.expectNone({ method: 'POST' });
    const t = q('[data-testid="reject-reason"]') as HTMLTextAreaElement;
    t.value = 'Sin disponibilidad del equipo';
    t.dispatchEvent(new Event('input'));
    await submit('RESCHEDULE-70');
    const req = http.expectOne({ method: 'POST', url: `${A}/reschedules/70/decision` });
    expect(req.request.body).toEqual({ approve: false, reason: 'Sin disponibilidad del equipo' });
    req.flush(null);
    http.expectOne(`${A}/inbox`).flush([APPOINTMENT]);
    await fixture.whenStable();
    expect(q('[data-testid="decided-RESCHEDULE-70"]')?.textContent).toContain('Reprogramación rechazada');
    expect(q('[data-testid="decided-RESCHEDULE-70"]')?.textContent).toContain('conserva su horario original');
  });
});
