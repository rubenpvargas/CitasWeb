import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OperationsComponent } from './operations';
import { operationsHome } from './operations-links';
import { InboxComponent } from './inbox/inbox';
import { AgendaComponent } from './agenda/agenda';
import { SessionStore } from '../../core/auth/session.store';
import { AppConfigService } from '../../core/config/app-config.service';
import { TEST_API_URL, loginResponse } from '../../testing/fixtures';
import { routes } from '../../app.routes';

describe('OperationsComponent (shell)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [OperationsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
  });

  afterEach(() => sessionStorage.clear());

  async function linksFor(roles: string[]): Promise<string[]> {
    TestBed.inject(SessionStore).start(loginResponse(roles));
    const fixture = TestBed.createComponent(OperationsComponent);
    await fixture.whenStable();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a')).map((a) => a.getAttribute('href') ?? '');
  }

  it('ADMIN ve solo secciones administrativas', async () => {
    const links = await linksFor(['ADMIN']);
    expect(links).toContain('/bandeja');
    expect(links).not.toContain('/agenda');
  });

  it('PROFESSIONAL ve solo secciones profesionales', async () => {
    const links = await linksFor(['PROFESSIONAL']);
    expect(links).toContain('/agenda');
    expect(links).not.toContain('/bandeja');
  });

  it('operationsHome elige la sección inicial por rol', () => {
    expect(operationsHome(['ADMIN'])).toBe('bandeja');
    expect(operationsHome(['PROFESSIONAL'])).not.toBe('bandeja');
  });

  it('las rutas hijas de /operacion exigen rol', () => {
    const children = routes.find((r) => r.path === 'operacion')?.children ?? [];
    for (const child of children.filter((c) => c.path)) {
      expect(child.canActivate?.length).toBe(1);
      expect((child.data?.['roles'] as string[]).length).toBeGreaterThan(0);
    }
  });
});

describe('InboxComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga la bandeja con estados de carga, vacío y error', async () => {
    const fixture = TestBed.createComponent(InboxComponent);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.textContent).toContain('Cargando bandeja');
    http.expectOne(`${TEST_API_URL}/api/v1/admin/inbox`).flush([]);
    await fixture.whenStable();
    expect(el.textContent).toContain('No hay solicitudes pendientes');

    (el.querySelector('button') as HTMLButtonElement).click();
    http.expectOne(`${TEST_API_URL}/api/v1/admin/inbox`).flush(null, { status: 500, statusText: 'x' });
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('error inesperado');
  });

  it('decide una cita con el endpoint según el tipo', async () => {
    const fixture = TestBed.createComponent(InboxComponent);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne(`${TEST_API_URL}/api/v1/admin/inbox`).flush([
      { itemType: 'RESCHEDULE', id: 4, status: 'PENDING', startAt: '2026-10-05T08:00:00', specialtyName: 'Cardiología', locationCode: 'HIC' },
    ]);
    await fixture.whenStable();
    expect(el.textContent).toContain('Reprogramación #4');
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Aprobar')) as HTMLButtonElement).click();
    const req = http.expectOne(`${TEST_API_URL}/api/v1/admin/reschedules/4/decision`);
    expect(req.request.body.approve).toBe(true);
    req.flush(null);
    http.expectOne(`${TEST_API_URL}/api/v1/admin/inbox`).flush([]);
  });
});

describe('AgendaComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta 30 días desde hoy (Bogotá) y muestra vacío', async () => {
    const fixture = TestBed.createComponent(AgendaComponent);
    await fixture.whenStable();
    const req = http.expectOne((r) => r.url === `${TEST_API_URL}/api/v1/professional/agenda`);
    expect(req.request.params.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(req.request.params.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    req.flush([]);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin citas aprobadas');
  });
});
