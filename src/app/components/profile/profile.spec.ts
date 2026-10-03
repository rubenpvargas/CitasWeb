import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ProfileComponent } from './profile';
import { AppConfigService } from '../../core/config/app-config.service';
import { SessionStore } from '../../core/auth/session.store';
import { PortalService } from '../../services/portal.service';
import { TEST_API_URL, loginResponse } from '../../testing/fixtures';

const LOGOUT_URL = `${TEST_API_URL}/api/v1/auth/logout`;

describe('ProfileComponent logout (HU-003)', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;
  let session: SessionStore;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    session = TestBed.inject(SessionStore);
    session.start(loginResponse(['USER']));
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ProfileComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  const button = () => el.querySelector('[data-testid="logout-button"]') as HTMLButtonElement;

  it('muestra la identidad de la sesión', () => {
    expect(el.textContent).toContain('Paciente Sintético');
  });

  it('logout revoca en la API, muestra estado de carga y vuelve a login', async () => {
    button().click();
    await fixture.whenStable();
    expect(button().disabled).toBe(true);
    expect(el.querySelector('[data-testid="logout-label"]')?.textContent).toContain('Cerrando sesión');

    const req = http.expectOne(LOGOUT_URL);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(session.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('logout limpia la sesión aunque la API falle', async () => {
    button().click();
    http.expectOne(LOGOUT_URL).flush({ code: 'INVALID_REFRESH_TOKEN' }, { status: 401, statusText: 'Unauthorized' });
    expect(session.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('no conserva datos del usuario anterior tras cerrar sesión', async () => {
    const portal = TestBed.inject(PortalService);
    portal.citas.set([]);
    portal.emptyStateSimulated.set(true);
    button().click();
    http.expectOne(LOGOUT_URL).flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    TestBed.tick();
    expect(portal.citas().length).toBeGreaterThan(0);
    expect(portal.emptyStateSimulated()).toBe(false);
    expect(portal.activePatient().fullName).toBe('');
  });
});
