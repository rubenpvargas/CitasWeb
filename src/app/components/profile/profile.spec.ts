import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ProfileComponent } from './profile';
import { AppConfigService } from '../../core/config/app-config.service';
import { SessionStore } from '../../core/auth/session.store';
import { PortalService } from '../../services/portal.service';
import { ProfileDto } from '../../core/api/profile.api';
import { TEST_API_URL, loginResponse } from '../../testing/fixtures';

const LOGOUT_URL = `${TEST_API_URL}/api/v1/auth/logout`;
const ME_URL = `${TEST_API_URL}/api/v1/me`;

const PROFILE: ProfileDto = {
  id: 7,
  firstName: 'Paciente',
  lastName: 'Sintético',
  email: 'paciente@example.test',
  documentType: 'CC',
  documentNumber: '100200300',
  phone: '3000000000',
  roles: ['USER'],
};

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;
  let session: SessionStore;

  async function create(flushProfile: ProfileDto | 'error' | null = PROFILE) {
    fixture = TestBed.createComponent(ProfileComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    // La sección de afiliación (HU-006) tiene sus propias pruebas.
    http
      .match((r) => r.url.endsWith('/me/affiliations') || r.url.endsWith('/insurance/eps'))
      .forEach((r) => r.flush([]));
    if (flushProfile === 'error') {
      http.expectOne(ME_URL).flush({ code: 'INTERNAL_ERROR' }, { status: 500, statusText: 'Error' });
    } else if (flushProfile) {
      http.expectOne(ME_URL).flush(flushProfile);
    }
    await fixture.whenStable();
  }

  beforeEach(() => {
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
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  const q = (sel: string) => el.querySelector(sel) as HTMLElement | null;
  const button = () => q('[data-testid="logout-button"]') as HTMLButtonElement;

  function type(id: string, value: string) {
    const input = el.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  describe('HU-005 perfil', () => {
    it('muestra estado de carga y luego los datos de GET /me', async () => {
      await create(null);
      expect(q('[data-testid="profile-loading"]')?.getAttribute('role')).toBe('status');
      http.expectOne(ME_URL).flush(PROFILE);
      await fixture.whenStable();
      expect(q('[data-testid="profile-loading"]')).toBeNull();
      expect(el.textContent).toContain('CC 100200300');
      expect(el.textContent).toContain('paciente@example.test');
      expect(el.textContent).not.toContain('Floridablanca');
    });

    it('error de carga es accesible y permite reintentar', async () => {
      await create('error');
      expect(q('[data-testid="profile-load-error"]')?.getAttribute('role')).toBe('alert');
      (q('[data-testid="profile-load-error"] button') as HTMLButtonElement).click();
      http.expectOne(ME_URL).flush(PROFILE);
      await fixture.whenStable();
      expect(q('[data-testid="profile-load-error"]')).toBeNull();
    });

    it('edita nombres y teléfono; email y documento son de solo lectura', async () => {
      await create();
      (q('[data-testid="profile-edit"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      expect((q('#profile-email') as HTMLInputElement).disabled).toBe(true);
      expect((q('#profile-document') as HTMLInputElement).disabled).toBe(true);
      expect((q('#profile-first-name') as HTMLInputElement).value).toBe('Paciente');

      type('profile-first-name', ' Ana ');
      type('profile-phone', '3110000000');
      (q('[data-testid="profile-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      expect((q('[data-testid="profile-save"]') as HTMLButtonElement).disabled).toBe(true);
      expect(q('[data-testid="profile-save"]')?.textContent).toContain('Guardando');

      const req = http.expectOne({ method: 'PATCH', url: ME_URL });
      expect(req.request.body).toEqual({ firstName: 'Ana', lastName: 'Sintético', phone: '3110000000' });
      req.flush({ ...PROFILE, firstName: 'Ana', phone: '3110000000' });
      await fixture.whenStable();

      expect(q('[data-testid="profile-success"]')?.closest('[role="status"]')).not.toBeNull();
      expect(q('[data-testid="profile-name"]')?.textContent).toContain('Ana Sintético');
      expect(session.user()?.firstName).toBe('Ana');
    });

    it('valida en cliente sin llamar a la API', async () => {
      await create();
      (q('[data-testid="profile-edit"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      type('profile-first-name', '');
      (q('[data-testid="profile-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      http.expectNone({ method: 'PATCH', url: ME_URL });
      expect(q('#profile-first-name')?.getAttribute('aria-invalid')).toBe('true');
      expect(q('#profile-first-name-error')).not.toBeNull();
    });

    it('400 VALIDATION_ERROR marca campos y conserva los datos', async () => {
      await create();
      (q('[data-testid="profile-edit"]') as HTMLButtonElement).click();
      await fixture.whenStable();
      (q('[data-testid="profile-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
      http.expectOne({ method: 'PATCH', url: ME_URL }).flush(
        { code: 'VALIDATION_ERROR', errors: [{ field: 'phone', message: 'size' }] },
        { status: 400, statusText: 'Bad Request' },
      );
      await fixture.whenStable();
      expect(q('[data-testid="profile-save-error"]')?.closest('[role="alert"]')).not.toBeNull();
      expect(q('#profile-phone-error')).not.toBeNull();
      expect(q('[data-testid="profile-form"]')).not.toBeNull();
    });
  });

  describe('HU-003 logout', () => {
    beforeEach(async () => create());

    it('logout revoca en la API, muestra estado de carga y vuelve a login', async () => {
      button().click();
      await fixture.whenStable();
      expect(button().disabled).toBe(true);
      expect(q('[data-testid="logout-label"]')?.textContent).toContain('Cerrando sesión');

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
});
