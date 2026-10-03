import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService, NoRefreshTokenError } from './auth.service';
import { SessionStore } from './session.store';
import { AppConfigService } from '../config/app-config.service';
import { TEST_API_URL, loginResponse, tokenResponse } from '../../testing/fixtures';

describe('AuthService', () => {
  let service: AuthService;
  let session: SessionStore;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    service = TestBed.inject(AuthService);
    session = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('login envía LoginRequest, guarda la sesión y devuelve el usuario', () => {
    let user: unknown;
    service.login('paciente@example.test', 'Clave-Sintetica-1').subscribe((u) => (user = u));

    const req = http.expectOne(`${TEST_API_URL}/api/v1/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'paciente@example.test', password: 'Clave-Sintetica-1' });
    req.flush(loginResponse(['USER']));

    expect(user).toEqual(expect.objectContaining({ firstName: 'Paciente', roles: ['USER'] }));
    expect(session.accessToken()).toBe('access-1');
  });

  it('login fallido no crea sesión', () => {
    let failed = false;
    service.login('x@example.test', 'mala').subscribe({ error: () => (failed = true) });
    http.expectOne(`${TEST_API_URL}/api/v1/auth/login`).flush({ code: 'INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('register envía exactamente RegisterRequest', () => {
    const body = {
      firstName: 'Ana', lastName: 'Prueba', documentType: 'CC', documentNumber: '100200300',
      email: 'ana@example.test', phone: '3000000000', password: 'ClaveSegura1',
    };
    service.register(body).subscribe();
    const req = http.expectOne(`${TEST_API_URL}/api/v1/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ ...body, id: 1, roles: ['USER'], password: undefined }, { status: 201, statusText: 'Created' });
  });

  it('refreshSession rota los tokens', () => {
    session.start(loginResponse());
    service.refreshSession().subscribe();
    const req = http.expectOne(`${TEST_API_URL}/api/v1/auth/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush(tokenResponse('2'));
    expect(session.accessToken()).toBe('access-2');
    expect(session.refreshToken()).toBe('refresh-2');
  });

  it('refreshSession es single-flight para llamadas concurrentes', () => {
    session.start(loginResponse());
    const results: string[] = [];
    service.refreshSession().subscribe((t) => results.push(t.accessToken));
    service.refreshSession().subscribe((t) => results.push(t.accessToken));
    service.refreshSession().subscribe((t) => results.push(t.accessToken));

    http.expectOne(`${TEST_API_URL}/api/v1/auth/refresh`).flush(tokenResponse('2'));
    expect(results).toEqual(['access-2', 'access-2', 'access-2']);

    // Una vez resuelta, una nueva renovación vuelve a llamar a la API.
    service.refreshSession().subscribe();
    http.expectOne(`${TEST_API_URL}/api/v1/auth/refresh`).flush(tokenResponse('3'));
  });

  it('refreshSession falla sin refresh token', () => {
    let error: unknown;
    service.refreshSession().subscribe({ error: (e) => (error = e) });
    expect(error).toBeInstanceOf(NoRefreshTokenError);
  });

  it('logout revoca en la API y limpia la sesión', () => {
    session.start(loginResponse());
    let completed = false;
    service.logout().subscribe({ complete: () => (completed = true) });
    const req = http.expectOne(`${TEST_API_URL}/api/v1/auth/logout`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('logout limpia la sesión aunque la API falle y no emite error', () => {
    session.start(loginResponse());
    let completed = false;
    let errored = false;
    service.logout().subscribe({ complete: () => (completed = true), error: () => (errored = true) });
    http.expectOne(`${TEST_API_URL}/api/v1/auth/logout`).error(new ProgressEvent('error'));
    expect(completed).toBe(true);
    expect(errored).toBe(false);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('expireSession limpia y navega a login con aviso de sesión expirada', () => {
    session.start(loginResponse());
    service.expireSession();
    expect(session.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { aviso: 'sesion-expirada' } });
  });

  it('requestPasswordReset y confirmPasswordReset usan el contrato de HU-004', () => {
    service.requestPasswordReset('ana@example.test').subscribe();
    const r1 = http.expectOne(`${TEST_API_URL}/api/v1/auth/password-reset/request`);
    expect(r1.request.body).toEqual({ email: 'ana@example.test' });
    r1.flush({ message: 'ok' }, { status: 202, statusText: 'Accepted' });

    service.confirmPasswordReset('tok', 'NuevaClave1').subscribe();
    const r2 = http.expectOne(`${TEST_API_URL}/api/v1/auth/password-reset/confirm`);
    expect(r2.request.body).toEqual({ token: 'tok', newPassword: 'NuevaClave1' });
    r2.flush(null, { status: 204, statusText: 'No Content' });
  });
});
