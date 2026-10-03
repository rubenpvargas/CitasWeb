import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { InboxComponent } from './inbox';
import { AppConfigService } from '../../../core/config/app-config.service';
import { InboxItemDto } from '../../../core/api/admin.api';
import { TEST_API_URL } from '../../../testing/fixtures';

const A = `${TEST_API_URL}/api/v1/admin`;
const ITEM: InboxItemDto = {
  itemType: 'APPOINTMENT', id: 7, status: 'REQUESTED', startAt: '2099-01-20T10:00:00',
  specialtyName: 'Cardiología', locationCode: 'HIC', patientFirstName: 'Paciente', patientLastName: 'Sintético',
};

describe('InboxComponent — decisión ADMIN (HU-018)', () => {
  let fixture: ComponentFixture<InboxComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  async function create(items: InboxItemDto[] | 'error' = [ITEM]) {
    fixture = TestBed.createComponent(InboxComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.textContent).toContain('Cargando bandeja');
    if (items === 'error') http.expectOne(`${A}/inbox`).flush(null, { status: 500, statusText: 'x' });
    else http.expectOne(`${A}/inbox`).flush(items);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InboxComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const click = async (testId: string) => {
    (q(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };
  const submit = async () => {
    (q('[data-testid="decision-APPOINTMENT-7"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  function typeReason(value: string) {
    const t = q('[data-testid="reject-reason"]') as HTMLTextAreaElement;
    t.value = value;
    t.dispatchEvent(new Event('input'));
  }

  it('estados vacío y error', async () => {
    await create([]);
    expect(q('[data-testid="inbox-empty"]')).not.toBeNull();
  });

  it('error de carga accesible', async () => {
    await create('error');
    expect(q('[data-testid="inbox-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });

  it('aprobar pide confirmación y envía {approve:true, reason:null}', async () => {
    await create();
    await click('approve-APPOINTMENT-7');
    http.expectNone({ method: 'POST' });
    expect(el.textContent).toContain('¿Confirmas la aprobación');
    await submit();
    const req = http.expectOne({ method: 'POST', url: `${A}/appointments/7/decision` });
    expect(req.request.body).toEqual({ approve: true, reason: null });
    req.flush({ id: 7, status: 'APPROVED' });
    http.expectOne(`${A}/inbox`).flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="inbox-message"]')?.textContent).toContain('Aprobada la solicitud #7');
  });

  it('cancelar la confirmación no llama a la API', async () => {
    await create();
    await click('approve-APPOINTMENT-7');
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancelar') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(q('[data-testid="decision-APPOINTMENT-7"]')).toBeNull();
    http.expectNone({ method: 'POST' });
  });

  it('rechazar exige motivo no vacío (sin motivos fijos)', async () => {
    await create();
    await click('reject-APPOINTMENT-7');
    typeReason('   ');
    await submit();
    http.expectNone({ method: 'POST' });
    expect(q('[data-testid="reject-reason"]')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.textContent).toContain('Escribe el motivo del rechazo');
    expect(el.textContent).not.toContain('No cumple criterios de laboratorio');
  });

  it('rechaza con el motivo escrito', async () => {
    await create();
    await click('reject-APPOINTMENT-7');
    typeReason('  Orden médica vencida  ');
    await submit();
    expect((q('[data-testid="decision-confirm"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: `${A}/appointments/7/decision` });
    expect(req.request.body).toEqual({ approve: false, reason: 'Orden médica vencida' });
    req.flush({ id: 7, status: 'REJECTED' });
    http.expectOne(`${A}/inbox`).flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="inbox-message"]')?.textContent).toContain('Rechazada');
  });

  it('409 REJECTION_REASON_REQUIRED del servidor se muestra', async () => {
    await create();
    await click('reject-APPOINTMENT-7');
    typeReason('x');
    await submit();
    http.expectOne({ method: 'POST', url: `${A}/appointments/7/decision` }).flush({ code: 'REJECTION_REASON_REQUIRED' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="decision-error"]')?.textContent).toContain('debes escribir un motivo');
  });

  it('409 INVALID_TRANSITION avisa y refresca la bandeja', async () => {
    await create();
    await click('approve-APPOINTMENT-7');
    await submit();
    http.expectOne({ method: 'POST', url: `${A}/appointments/7/decision` }).flush({ code: 'INVALID_TRANSITION' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    http.expectOne(`${A}/inbox`).flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="inbox-error"]')?.textContent).toContain('ya no está en un estado');
  });
});
