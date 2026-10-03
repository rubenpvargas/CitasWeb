import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppointmentsComponent } from './appointments';
import { AppConfigService } from '../../core/config/app-config.service';
import { MIXED, TEST_API_URL } from '../../testing/fixtures';

const URL = `${TEST_API_URL}/api/v1/appointments`;


describe('AppointmentsComponent — mis citas (HU-019)', () => {
  let fixture: ComponentFixture<AppointmentsComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  async function create(list: object[] | 'error' = MIXED) {
    fixture = TestBed.createComponent(AppointmentsComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="appointments-loading"]')).not.toBeNull();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.keys()).toEqual([]);
    if (list === 'error') req.flush(null, { status: 500, statusText: 'x' });
    else req.flush(list);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppointmentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  function set(id: string, value: string) {
    const input = q(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    input.value = value;
    input.dispatchEvent(new Event('change'));
  }
  const apply = async () => {
    (q('[data-testid="appointments-filters"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  it('etiqueta correctamente cada estado del backend', async () => {
    await create();
    const labels = [1, 2, 3, 4, 5, 6].map((id) => q(`[data-testid="status-${id}"]`)?.textContent?.trim());
    expect(labels).toEqual(['Pendiente de aprobación', 'Confirmada', 'Rechazada', 'Cancelada', 'Atendida', 'No asistió']);
  });

  it('muestra el motivo de rechazo y la reprogramación pendiente', async () => {
    await create();
    expect(q('[data-testid="rejection-3"]')?.textContent).toContain('Orden médica vencida');
    expect(q('[data-testid="pending-reschedule-7"]')?.textContent).toContain('pendiente de aprobación');
    expect(q('[data-testid="appointment-1"]')?.textContent).toContain('Pendiente de aprobación administrativa');
  });

  it('estado vacío con acceso a reservar', async () => {
    await create([]);
    expect(q('[data-testid="appointments-empty"]')).not.toBeNull();
  });

  it('error de carga accesible', async () => {
    await create('error');
    expect(q('[data-testid="appointments-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });

  it('filtra por estado y rango con parámetros del contrato', async () => {
    await create();
    set('ap-status', 'REJECTED');
    set('ap-from', '2099-01-01');
    set('ap-to', '2099-01-31');
    await apply();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('status')).toBe('REJECTED');
    expect(req.request.params.get('from')).toBe('2099-01-01');
    expect(req.request.params.get('to')).toBe('2099-01-31');
    req.flush([MIXED[2]]);
    await fixture.whenStable();
    expect(el.querySelectorAll('[data-testid^="appointment-"]').length).toBe(1);
  });

  it('valida el rango antes de consultar', async () => {
    await create();
    set('ap-from', '2099-01-01');
    await apply();
    http.expectNone((r) => r.url === URL);
    expect(q('[data-testid="appointments-error"]')?.textContent).toContain('ambas fechas');
    set('ap-to', '2099-03-01');
    await apply();
    http.expectNone((r) => r.url === URL);
    expect(q('[data-testid="appointments-error"]')?.textContent).toContain('31 días');
  });
});
