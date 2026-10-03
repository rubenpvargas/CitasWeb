import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard';
import { AppConfigService } from '../../core/config/app-config.service';
import { SessionStore } from '../../core/auth/session.store';
import { MIXED, TEST_API_URL, appointmentFixture, loginResponse } from '../../testing/fixtures';

const URL = `${TEST_API_URL}/api/v1/appointments`;

describe('DashboardComponent (/inicio con AppointmentDto)', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  async function create(list: object[] | 'error') {
    fixture = TestBed.createComponent(DashboardComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="dashboard-loading"]')).not.toBeNull();
    const req = http.expectOne((r) => r.url === URL);
    if (list === 'error') req.flush(null, { status: 500, statusText: 'x' });
    else req.flush(list);
    await fixture.whenStable();
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    TestBed.inject(SessionStore).start(loginResponse(['USER']));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;

  it('saluda con el nombre de la sesión y muestra la próxima cita real', async () => {
    await create(MIXED);
    expect(el.textContent).toContain('Hola, Paciente');
    // Próxima = la más cercana entre APPROVED/REQUESTED futuras (id 1, REQUESTED).
    expect(q('[data-testid="next-appointment"]')?.textContent).toContain('Medicina General');
    expect(q('[data-testid="next-status"]')?.textContent?.trim()).toBe('Pendiente de aprobación');
  });

  it('métricas calculadas desde los estados del backend', async () => {
    await create(MIXED);
    expect(q('[data-testid="metric-upcoming"]')?.textContent?.trim()).toBe('3');
    expect(q('[data-testid="metric-completed"]')?.textContent?.trim()).toBe('1');
    expect(q('[data-testid="metric-pending"]')?.textContent?.trim()).toBe('1');
  });

  it('las citas recientes usan las etiquetas compartidas (sin "Atendida" por defecto)', async () => {
    await create([
      appointmentFixture({ id: 11, status: 'NO_SHOW', startAt: '2020-01-02T08:00:00', endAt: '2020-01-02T08:30:00' }),
      appointmentFixture({ id: 12, status: 'ALGO_NUEVO', startAt: '2020-01-01T08:00:00', endAt: '2020-01-01T08:30:00' }),
    ]);
    expect(q('[data-testid="recent-11"]')?.textContent).toContain('No asistió');
    expect(q('[data-testid="recent-12"]')?.textContent).toContain('Estado desconocido');
    expect(q('[data-testid="recent-12"]')?.textContent).not.toContain('Atendida');
  });

  it('estado vacío sin citas y sin simulaciones', async () => {
    await create([]);
    expect(q('[data-testid="dashboard-empty"]')).not.toBeNull();
    expect(q('[data-testid="recent-empty"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Simular estado vacío');
    expect(el.textContent).not.toContain('Al calendario');
  });

  it('error de carga accesible', async () => {
    await create('error');
    expect(q('[data-testid="dashboard-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });
});
