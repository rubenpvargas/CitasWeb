import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AgendaComponent } from './agenda';
import { AppConfigService } from '../../../core/config/app-config.service';
import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { SessionStore } from '../../../core/auth/session.store';
import { AGENDA, TEST_API_URL, catalogsFixture, loginResponse } from '../../../testing/fixtures';

const AG = `${TEST_API_URL}/api/v1/professional/agenda`;
const CLOSE = (id: number) => `${TEST_API_URL}/api/v1/professional/appointments/${id}/close`;

describe('AgendaComponent — cerrar atención (HU-024)', () => {
  let fixture: ComponentFixture<AgendaComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AgendaComponent],
      // Con el interceptor real para comprobar que un 403 en el cierre no redirige.
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    TestBed.inject(SessionStore).start(loginResponse(['PROFESSIONAL']));
    TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AgendaComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush(catalogsFixture());
    http.expectOne((r) => r.url === AG).flush(AGENDA);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const click = async (testId: string) => {
    (q(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  it('closable=true ofrece Atendida/No asistió; closable=false muestra el motivo', () => {
    expect(q('[data-testid="close-completed-1"]')).not.toBeNull();
    expect(q('[data-testid="close-noshow-1"]')).not.toBeNull();
    expect(q('[data-testid="close-completed-2"]')).toBeNull();
    expect(q('[data-testid="not-closable-2"]')?.textContent).toContain('cuando inicie la cita');
  });

  it('COMPLETED: confirmación accesible y POST {outcome: COMPLETED}', async () => {
    await click('close-completed-1');
    const dialog = q('[data-testid="close-dialog"]');
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.textContent).toContain('"Atendida"');
    http.expectNone({ method: 'POST' });
    await click('close-confirm');
    expect((q('[data-testid="close-confirm"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: CLOSE(1) });
    expect(req.request.body).toEqual({ outcome: 'COMPLETED' });
    req.flush(null);
    await fixture.whenStable();
    http.expectOne((r) => r.url === AG).flush(AGENDA.slice(1));
    await fixture.whenStable();
    expect(q('[data-testid="agenda-message"]')?.textContent).toContain('cerrada como "Atendida"');
    expect(q('[data-testid="agenda-1"]')).toBeNull();
  });

  it('NO_SHOW: envía {outcome: NO_SHOW}', async () => {
    await click('close-noshow-1');
    expect(q('[data-testid="close-dialog"]')?.textContent).toContain('"No asistió"');
    await click('close-confirm');
    const req = http.expectOne({ method: 'POST', url: CLOSE(1) });
    expect(req.request.body).toEqual({ outcome: 'NO_SHOW' });
    req.flush(null);
    await fixture.whenStable();
    http.expectOne((r) => r.url === AG).flush([]);
  });

  it('Escape/Volver cancela sin llamar a la API', async () => {
    await click('close-completed-1');
    q('[data-testid="close-dialog"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(q('[data-testid="close-dialog"]')).toBeNull();
    http.expectNone({ method: 'POST' });
  });

  it('409 INVALID_TRANSITION se muestra en el diálogo y refresca la agenda', async () => {
    await click('close-completed-1');
    await click('close-confirm');
    http.expectOne({ method: 'POST', url: CLOSE(1) }).flush({ code: 'INVALID_TRANSITION' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="close-error"]')?.getAttribute('role')).toBe('alert');
    expect(q('[data-testid="close-error"]')?.textContent).toContain('ya no está en un estado');
    http.expectOne((r) => r.url === AG).flush(AGENDA);
  });

  it('404 (cita ajena) se muestra', async () => {
    await click('close-noshow-1');
    await click('close-confirm');
    http.expectOne({ method: 'POST', url: CLOSE(1) }).flush({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(q('[data-testid="close-error"]')?.textContent).toContain('no existe');
    http.expectOne((r) => r.url === AG).flush(AGENDA);
  });

  it('403 en el cierre se muestra en el diálogo sin redirigir', async () => {
    await click('close-completed-1');
    await click('close-confirm');
    http.expectOne({ method: 'POST', url: CLOSE(1) }).flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(q('[data-testid="close-error"]')?.textContent).toContain('No tienes permisos');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
